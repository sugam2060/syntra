import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TokenService } from '../../src/authentication/token.service';
import { EmailProducer } from '../../src/jobs/email/email.producer';

const PREFIX = '/api/v1/authentication';

class EmailProducerStub {
  verification: { email: string; link: string }[] = [];
  sendVerification = async (job: { email: string; link: string }) => void this.verification.push(job);
  sendPasswordReset = async () => undefined;
}

const refreshCookieOf = (response: request.Response): string | undefined =>
  (response.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
    c.startsWith('refresh_token='),
  );

const cookieValue = (response: request.Response, name: string): string | undefined =>
  (response.headers['set-cookie'] as unknown as string[] | undefined)
    ?.find((c) => c.startsWith(`${name}=`))
    ?.split(';')[0];

describe('Account security (e2e)', () => {
  const runId = randomUUID().slice(0, 8);
  const email = (name: string) => `sec-${runId}-${name}@test.local`;
  const password = 'correct-horse-battery';

  let app: INestApplication;
  let emails: EmailProducerStub;
  let owner: Client;

  beforeAll(async () => {
    Object.assign(process.env, { AUTH_THROTTLE_LIMIT: '1000', THROTTLE_LIMIT: '1000' });
    emails = new EmailProducerStub();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProducer)
      .useValue(emails)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [`sec-${runId}-%`]);
    await owner.end();
    await app.close();
  });

  const server = () => app.getHttpServer();

  /** Register, verify and log in. */
  const signUp = async (name: string) => {
    await request(server()).post(`${PREFIX}/register`).send({ email: email(name), password, name }).expect(201);
    const link = emails.verification.filter((m) => m.email === email(name)).pop()!.link;
    await request(server())
      .post(`${PREFIX}/verify-email`)
      .send({ token: new URL(link).searchParams.get('token') })
      .expect(204);
    return request(server()).post(`${PREFIX}/login`).send({ email: email(name), password }).expect(200);
  };

  /** An account that exists only through Google: no password credential. */
  const oauthOnlyUser = async (name: string) => {
    const { rows } = await owner.query<{ id: string }>(
      `SELECT app.auth_create_oauth_user($1, $2, NULL, 'google', $3) AS id`,
      [email(name), name, `g-${runId}-${name}`],
    );
    return rows[0].id;
  };

  const bearerFor = async (userId: string, mail: string) => {
    const tokens = app.get(TokenService, { strict: false });
    const { token } = await tokens.signAccessToken({ id: userId, email: mail, emailVerified: true });
    return `Bearer ${token}`;
  };

  describe('GET me', () => {
    it('reports how the user can sign in', async () => {
      const login = await signUp('mia');
      const me = await request(server())
        .get(`${PREFIX}/me`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ email: email('mia'), hasPassword: true, providers: [] });
    });

    it('shows a linked provider and no password for an OAuth-only user', async () => {
      const id = await oauthOnlyUser('olga');
      const me = await request(server())
        .get(`${PREFIX}/me`)
        .set('Authorization', await bearerFor(id, email('olga')))
        .expect(200);
      expect(me.body).toMatchObject({ hasPassword: false, providers: ['google'] });
    });
  });

  describe('POST change-password', () => {
    it('changes the password, revokes the other sessions and returns a fresh one', async () => {
      const first = await signUp('cora');
      const other = await request(server()).post(`${PREFIX}/login`).send({ email: email('cora'), password }).expect(200);
      const otherCookie = refreshCookieOf(other)!.split(';')[0];

      const changed = await request(server())
        .post(`${PREFIX}/change-password`)
        .set('Authorization', `Bearer ${first.body.accessToken}`)
        .send({ currentPassword: password, newPassword: 'a-completely-new-passphrase' })
        .expect(200);

      expect(changed.body.accessToken).toEqual(expect.any(String));
      const newCookie = refreshCookieOf(changed)!;
      expect(newCookie).toMatch(/HttpOnly/i);

      // The other device is signed out; the old password no longer works; the new one does.
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', otherCookie).expect(401);
      await request(server()).post(`${PREFIX}/login`).send({ email: email('cora'), password }).expect(401);
      await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('cora'), password: 'a-completely-new-passphrase' })
        .expect(200);
      // The session returned by the call itself keeps working.
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', newCookie.split(';')[0]).expect(200);
    });

    it('rejects a wrong current password, a missing one, and an unchanged password', async () => {
      const login = await signUp('wade');
      const auth = { Authorization: `Bearer ${login.body.accessToken}` };

      await request(server()).post(`${PREFIX}/change-password`).set(auth)
        .send({ currentPassword: 'definitely-wrong', newPassword: 'another-new-passphrase' }).expect(403);
      await request(server()).post(`${PREFIX}/change-password`).set(auth)
        .send({ newPassword: 'another-new-passphrase' }).expect(400);
      await request(server()).post(`${PREFIX}/change-password`).set(auth)
        .send({ currentPassword: password, newPassword: password }).expect(400);
      await request(server()).post(`${PREFIX}/change-password`).set(auth)
        .send({ currentPassword: password, newPassword: 'short' }).expect(400);
    });

    it('requires a signed-in user', async () => {
      await request(server())
        .post(`${PREFIX}/change-password`)
        .send({ currentPassword: password, newPassword: 'another-new-passphrase' })
        .expect(401);
    });

    it('lets an OAuth-only user add a password without a current one', async () => {
      const id = await oauthOnlyUser('pia');
      const auth = { Authorization: await bearerFor(id, email('pia')) };

      await request(server())
        .post(`${PREFIX}/change-password`)
        .set(auth)
        .send({ newPassword: 'my-first-password-1' })
        .expect(200);

      await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('pia'), password: 'my-first-password-1' })
        .expect(200);
      const me = await request(server()).get(`${PREFIX}/me`).set(auth).expect(200);
      expect(me.body.hasPassword).toBe(true);
    });
  });

  describe('Google link and unlink', () => {
    it('starts a link: a Google URL plus state and link cookies, bound to each other', async () => {
      const login = await signUp('lena');
      const response = await request(server())
        .post(`${PREFIX}/google/link`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      const url = new URL(response.body.url);
      expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/v1/authentication/callback/google',
      );
      expect(cookieValue(response, 'oauth_state')).toBe(`oauth_state=${url.searchParams.get('state')}`);
      const link = (response.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('oauth_link='))!;
      expect(link).toMatch(/HttpOnly/i);
      expect(link).toMatch(/Path=\/api\/v1\/authentication/);
    });

    it('requires a signed-in user to start a link', async () => {
      await request(server()).post(`${PREFIX}/google/link`).expect(401);
    });

    it('a fresh Google sign-in discards an abandoned link attempt', async () => {
      const response = await request(server()).get(`${PREFIX}/google`).expect(302);
      const cleared = (response.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('oauth_link='));
      expect(cleared).toMatch(/oauth_link=;/);
    });

    it('a callback carrying an intent for another state ends in oauth_failed and links nothing', async () => {
      const login = await signUp('gina');
      const started = await request(server())
        .post(`${PREFIX}/google/link`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      const link = cookieValue(started, 'oauth_link')!;

      // The attacker-chosen state differs from the one the intent was issued for.
      const response = await request(server())
        .get(`${PREFIX}/callback/google?code=fake&state=other`)
        .set('Cookie', [link, 'oauth_state=other'])
        .expect(302);
      expect(response.headers.location).toContain('error=oauth_failed');
      expect(refreshCookieOf(response)).toBeUndefined();
    });

    it('unlinks Google when a password remains, and then answers 404', async () => {
      const id = await oauthOnlyUser('uma');
      const auth = { Authorization: await bearerFor(id, email('uma')) };
      await request(server()).post(`${PREFIX}/change-password`).set(auth).send({ newPassword: 'umas-new-password-1' }).expect(200);

      await request(server()).delete(`${PREFIX}/google`).set(auth).expect(204);
      const me = await request(server()).get(`${PREFIX}/me`).set(auth).expect(200);
      expect(me.body.providers).toEqual([]);
      await request(server()).delete(`${PREFIX}/google`).set(auth).expect(404);
    });

    it('refuses to remove the only way to sign in', async () => {
      const id = await oauthOnlyUser('ned');
      const auth = { Authorization: await bearerFor(id, email('ned')) };
      const response = await request(server()).delete(`${PREFIX}/google`).set(auth).expect(409);
      expect(response.body.message).toMatch(/password/i);

      const me = await request(server()).get(`${PREFIX}/me`).set(auth).expect(200);
      expect(me.body.providers).toEqual(['google']);
    });
  });
});
