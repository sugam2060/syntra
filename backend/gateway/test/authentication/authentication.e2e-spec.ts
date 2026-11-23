import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { EmailProducer } from '../../src/jobs/email/email.producer';

const PREFIX = '/api/v1/authentication';

interface CapturedEmail {
  email: string;
  link: string;
}

class EmailProducerStub {
  verification: CapturedEmail[] = [];
  reset: CapturedEmail[] = [];
  sendVerification = async (job: CapturedEmail) => void this.verification.push(job);
  sendPasswordReset = async (job: CapturedEmail) => void this.reset.push(job);
}

const tokenFrom = (link: string): string => new URL(link).searchParams.get('token') as string;

const refreshCookieOf = (response: request.Response): string | undefined =>
  (response.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
    c.startsWith('refresh_token='),
  );

async function createApp(env: Record<string, string> = {}) {
  Object.assign(process.env, { AUTH_THROTTLE_LIMIT: '1000', THROTTLE_LIMIT: '1000', ...env });
  const emails = new EmailProducerStub();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailProducer)
    .useValue(emails)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, emails };
}

describe('Authentication (e2e)', () => {
  const runId = randomUUID().slice(0, 8);
  const email = (name: string) => `e2e-${runId}-${name}@test.local`;
  const password = 'correct-horse-battery';

  let app: INestApplication;
  let emails: EmailProducerStub;
  let owner: Client;

  beforeAll(async () => {
    ({ app, emails } = await createApp());
    owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [`e2e-${runId}-%`]);
    await owner.end();
    await app.close();
  });

  const server = () => app.getHttpServer();

  const register = (name: string) =>
    request(server()).post(`${PREFIX}/register`).send({ email: email(name), password, name });

  const login = (name: string, pass = password) =>
    request(server()).post(`${PREFIX}/login`).send({ email: email(name), password: pass });

  const latest = (list: CapturedEmail[], name: string) =>
    list.filter((m) => m.email === email(name)).pop();

  const verifyEmailOf = (name: string) =>
    request(server())
      .post(`${PREFIX}/verify-email`)
      .send({ token: tokenFrom(latest(emails.verification, name)!.link) });

  const userRow = async (name: string) =>
    (
      await owner.query<{ is_active: boolean; email_verified_at: Date | null }>(
        `SELECT is_active, email_verified_at FROM public.users WHERE email = $1`,
        [email(name)],
      )
    ).rows[0];

  /**
   * Registration neither verifies nor signs in: an account stays inactive until its email is
   * verified, so tests that need a session register, verify and then log in explicitly.
   */
  const signUp = async (name: string) => {
    await register(name).expect(201);
    await verifyEmailOf(name).expect(204);
    return login(name).expect(200);
  };

  describe('routing', () => {
    it('serves routes only under the /api/v1 prefix', async () => {
      await request(server()).post('/authentication/login').send({}).expect(404);
      await request(server()).post(`${PREFIX}/login`).send({}).expect(400);
    });
  });

  describe('register and login', () => {
    it('registers an inactive account without logging in: user only, no token, no cookie, verification mail queued', async () => {
      const response = await register('alice').expect(201);

      expect(response.body).toEqual({
        user: expect.objectContaining({
          email: email('alice'),
          name: 'alice',
          emailVerified: false,
        }),
      });
      expect(JSON.stringify(response.body)).not.toContain(password);
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.headers['set-cookie']).toBeUndefined();

      expect(await userRow('alice')).toEqual({ is_active: false, email_verified_at: null });

      const mail = emails.verification.find((m) => m.email === email('alice'));
      expect(mail?.link).toMatch(/^http:\/\/localhost:3001\/verify-email\?token=/);
    });

    it('keeps the account inactive until the email is verified, then activates it', async () => {
      await register('zoe').expect(201);

      // Right password, unverified email: a specific, machine-readable 403.
      const blocked = await login('zoe').expect(403);
      expect(blocked.body.error).toBe('EMAIL_NOT_VERIFIED');
      expect(blocked.headers['set-cookie']).toBeUndefined();
      // The verification state is only disclosed to the holder of the right password.
      await login('zoe', 'definitely-wrong').expect(401);
      await request(server()).post(`${PREFIX}/refresh`).expect(401);
      expect(await userRow('zoe')).toEqual({ is_active: false, email_verified_at: null });

      await verifyEmailOf('zoe').expect(204);
      expect(await userRow('zoe')).toEqual({
        is_active: true,
        email_verified_at: expect.any(Date),
      });

      const response = await login('zoe').expect(200);
      expect(response.body).toMatchObject({
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { email: email('zoe'), emailVerified: true },
      });
      expect(response.body).not.toHaveProperty('refreshToken');

      const cookie = refreshCookieOf(response)!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/authentication/);
    });

    it('rejects a duplicate email regardless of case', async () => {
      await register('dupe').expect(201);
      await request(server())
        .post(`${PREFIX}/register`)
        .send({ email: email('DUPE').toUpperCase(), password })
        .expect(409);
    });

    it('validates input and refuses unknown fields', async () => {
      await request(server())
        .post(`${PREFIX}/register`)
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
      await request(server())
        .post(`${PREFIX}/register`)
        .send({ email: email('extra'), password, isAdmin: true })
        .expect(400);
    });

    it('logs in with the right password and gives one generic error otherwise', async () => {
      await signUp('bob');

      const wrong = await login('bob', 'definitely-wrong').expect(401);
      const unknown = await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('nobody'), password })
        .expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('reports an account disabled by an administrator like any failed login', async () => {
      await signUp('mallory');
      await owner.query(`UPDATE public.users SET is_active = false WHERE email = $1`, [
        email('mallory'),
      ]);

      const response = await login('mallory').expect(401);
      expect(response.body.error).not.toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('protected routes', () => {
    it('requires a valid access token for /me', async () => {
      await request(server()).get(`${PREFIX}/me`).expect(401);
      await request(server()).get(`${PREFIX}/me`).set('Authorization', 'Bearer garbage').expect(401);

      const { body } = await signUp('carol');
      await request(server())
        .get(`${PREFIX}/me`)
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200)
        .expect((r) => expect(r.body).toMatchObject({ email: email('carol') }));
    });
  });

  describe('refresh rotation', () => {
    it('rotates the refresh token and revokes the whole family when an old one is replayed', async () => {
      const first = await signUp('dave');
      const cookie1 = refreshCookieOf(first)!.split(';')[0];

      const second = await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookie1).expect(200);
      const cookie2 = refreshCookieOf(second)!.split(';')[0];
      expect(cookie2).not.toEqual(cookie1);
      expect(second.body.accessToken).toEqual(expect.any(String));

      // Replaying the already-rotated token is treated as theft...
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookie1).expect(401);
      // ...so the newest token is dead too.
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookie2).expect(401);
    });

    it('rejects a missing or invalid refresh cookie', async () => {
      await request(server()).post(`${PREFIX}/refresh`).expect(401);
      await request(server())
        .post(`${PREFIX}/refresh`)
        .set('Cookie', 'refresh_token=not-a-real-token')
        .expect(401);
    });
  });

  describe('logout', () => {
    it('revokes the session and clears the cookie', async () => {
      const registered = await signUp('erin');
      const cookie = refreshCookieOf(registered)!.split(';')[0];

      const out = await request(server()).post(`${PREFIX}/logout`).set('Cookie', cookie).expect(204);
      expect(refreshCookieOf(out)).toMatch(/refresh_token=;/);

      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookie).expect(401);
    });

    it('logout-all revokes every session of the user', async () => {
      const a = await signUp('frank');
      const cookieA = refreshCookieOf(a)!.split(';')[0];
      const b = await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('frank'), password })
        .expect(200);
      const cookieB = refreshCookieOf(b)!.split(';')[0];

      await request(server())
        .post(`${PREFIX}/logout-all`)
        .set('Authorization', `Bearer ${a.body.accessToken}`)
        .expect(204);

      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookieA).expect(401);
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', cookieB).expect(401);
    });
  });

  describe('email verification', () => {
    it('verifies once, activates the account and rejects reuse', async () => {
      await register('grace').expect(201);
      const token = tokenFrom(latest(emails.verification, 'grace')!.link);

      await request(server()).post(`${PREFIX}/verify-email`).send({ token }).expect(204);
      await request(server()).post(`${PREFIX}/verify-email`).send({ token }).expect(400);
      expect((await userRow('grace')).is_active).toBe(true);

      const response = await login('grace').expect(200);
      expect(response.body.user.emailVerified).toBe(true);
    });

    it('rejects a forged token', async () => {
      await request(server())
        .post(`${PREFIX}/verify-email`)
        .send({ token: 'x'.repeat(43) })
        .expect(400);
    });

    it('resends a fresh link by email (no login needed) and invalidates the old one', async () => {
      await register('heidi').expect(201);
      const oldToken = tokenFrom(latest(emails.verification, 'heidi')!.link);
      const before = emails.verification.length;

      await request(server())
        .post(`${PREFIX}/resend-verification`)
        .send({ email: email('heidi') })
        .expect(202);
      expect(emails.verification.length).toBe(before + 1);

      await request(server()).post(`${PREFIX}/verify-email`).send({ token: oldToken }).expect(400);
      await verifyEmailOf('heidi').expect(204);
      expect((await userRow('heidi')).is_active).toBe(true);
    });

    it('answers 202 and sends nothing for unknown or already verified emails', async () => {
      await signUp('verified-vic');
      const before = emails.verification.length;

      for (const target of [email('verified-vic'), email('no-such-user')]) {
        await request(server())
          .post(`${PREFIX}/resend-verification`)
          .send({ email: target })
          .expect(202);
      }
      expect(emails.verification.length).toBe(before);
    });
  });

  describe('password reset', () => {
    it('answers the same for unknown emails and sends nothing', async () => {
      const before = emails.reset.length;
      await request(server())
        .post(`${PREFIX}/forgot-password`)
        .send({ email: email('ghost') })
        .expect(202);
      expect(emails.reset.length).toBe(before);
    });

    it('resets the password, revokes sessions and burns the token', async () => {
      const registered = await signUp('ivan');
      const oldCookie = refreshCookieOf(registered)!.split(';')[0];

      await request(server())
        .post(`${PREFIX}/forgot-password`)
        .send({ email: email('ivan') })
        .expect(202);
      const token = tokenFrom(emails.reset.find((m) => m.email === email('ivan'))!.link);

      const newPassword = 'a-brand-new-passphrase';
      await request(server())
        .post(`${PREFIX}/reset-password`)
        .send({ token, password: newPassword })
        .expect(204);
      await request(server())
        .post(`${PREFIX}/reset-password`)
        .send({ token, password: 'another-passphrase-x' })
        .expect(400);

      await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('ivan'), password })
        .expect(401);
      await request(server())
        .post(`${PREFIX}/login`)
        .send({ email: email('ivan'), password: newPassword })
        .expect(200);
      await request(server()).post(`${PREFIX}/refresh`).set('Cookie', oldCookie).expect(401);
    });
  });

  describe('password reset for pending and disabled accounts', () => {
    it('lets a pending (unverified) account reset, which proves email ownership and activates it', async () => {
      await register('judy').expect(201);
      expect(await userRow('judy')).toEqual({ is_active: false, email_verified_at: null });

      await request(server())
        .post(`${PREFIX}/forgot-password`)
        .send({ email: email('judy') })
        .expect(202);
      const token = tokenFrom(latest(emails.reset, 'judy')!.link);

      await request(server())
        .post(`${PREFIX}/reset-password`)
        .send({ token, password: 'judys-new-passphrase' })
        .expect(204);

      expect(await userRow('judy')).toEqual({
        is_active: true,
        email_verified_at: expect.any(Date),
      });
      await login('judy', 'judys-new-passphrase').expect(200);
    });

    it('does not send a reset link for an administrator-disabled account', async () => {
      await signUp('trent');
      await owner.query(`UPDATE public.users SET is_active = false WHERE email = $1`, [
        email('trent'),
      ]);
      const before = emails.reset.length;

      await request(server())
        .post(`${PREFIX}/forgot-password`)
        .send({ email: email('trent') })
        .expect(202);

      expect(emails.reset.length).toBe(before);
    });
  });

  describe('Google OAuth', () => {
    it('redirects to Google with the registered callback, the right scopes and a state cookie', async () => {
      const response = await request(server()).get(`${PREFIX}/google`).expect(302);

      const location = new URL(response.headers.location);
      expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(location.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/v1/authentication/callback/google',
      );
      expect(location.searchParams.get('scope')).toContain('email');
      expect(location.searchParams.get('client_id')).toBeTruthy();

      const state = location.searchParams.get('state')!;
      const cookie = (response.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('oauth_state='),
      )!;
      expect(cookie).toContain(`oauth_state=${state}`);
      expect(cookie).toMatch(/HttpOnly/i);
    });

    it('sends the browser back to the frontend when the callback state does not match', async () => {
      const response = await request(server())
        .get(`${PREFIX}/callback/google?code=fake&state=forged`)
        .set('Cookie', 'oauth_state=the-real-state')
        .expect(302);
      expect(response.headers.location).toBe(
        'http://localhost:3001/auth/callback?error=oauth_failed',
      );
      expect(refreshCookieOf(response)).toBeUndefined();
    });

    it('sends the browser back to the frontend when the callback has no state cookie', async () => {
      const response = await request(server())
        .get(`${PREFIX}/callback/google?code=fake&state=whatever`)
        .expect(302);
      expect(response.headers.location).toContain('error=oauth_failed');
    });

    it('sends the browser back to the frontend when the user denies consent', async () => {
      const response = await request(server())
        .get(`${PREFIX}/callback/google?error=access_denied`)
        .expect(302);
      expect(response.headers.location).toContain('error=oauth_failed');
    });
  });

  describe('rate limiting', () => {
    it('answers 429 once the strict limit on login is exceeded', async () => {
      const limited = await createApp({ AUTH_THROTTLE_LIMIT: '3' });
      try {
        const statuses: number[] = [];
        for (let i = 0; i < 5; i += 1) {
          const r = await request(limited.app.getHttpServer())
            .post(`${PREFIX}/login`)
            .send({ email: email('limit'), password });
          statuses.push(r.status);
        }
        expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
        expect(statuses.slice(3)).toEqual([429, 429]);
      } finally {
        await limited.app.close();
      }
    });
  });
});
