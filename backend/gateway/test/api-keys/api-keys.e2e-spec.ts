import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TokenService } from '../../src/authentication/token.service';
import { Permission, RequiredPermission, WorkspaceId } from '../../src/authorization';
import { FixtureUser, WorkspaceFixture } from '../authorization/helpers/workspace-fixture';

/** Test-only workspace routes protected by permissions, called with a key or a JWT. */
@Controller('workspaces/:workspaceId/probe')
class ProbeController {
  @Get('ai')
  @RequiredPermission(Permission.AI_USE)
  ai(@WorkspaceId() workspaceId: string) {
    return { workspaceId };
  }

  @Get('task')
  @RequiredPermission(Permission.TASK_READ)
  task() {
    return { ok: true };
  }

  /** A forgotten decorator: signed-in users get in, API keys must not. */
  @Get('undeclared')
  undeclared() {
    return { ok: true };
  }
}

describe('API keys (e2e)', () => {
  const fixture = new WorkspaceFixture();
  const bearer = {} as Record<FixtureUser, string>;
  let app: INestApplication;
  let db: Client;

  const keysUrl = (workspaceId = fixture.workspaceId) => `/api/v1/workspaces/${workspaceId}/api-keys`;
  const probe = (path: string, workspaceId = fixture.workspaceId) =>
    request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceId}/probe/${path}`);

  const asUser = (user: FixtureUser) => ({ Authorization: `Bearer ${bearer[user]}` });

  const createKey = (user: FixtureUser, body: Record<string, unknown>, workspaceId?: string) =>
    request(app.getHttpServer())
      .post(keysUrl(workspaceId))
      .set(asUser(user))
      .send(body);

  beforeAll(async () => {
    Object.assign(process.env, { THROTTLE_LIMIT: '1000', AUTH_THROTTLE_LIMIT: '1000' });
    await fixture.setUp();
    db = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await db.connect();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const tokens = moduleRef.get(TokenService, { strict: false });
    for (const user of ['owner', 'admin', 'member', 'viewer', 'outsider'] as const) {
      const { token } = await tokens.signAccessToken({
        id: fixture.ids[user],
        email: fixture.emails[user],
        emailVerified: true,
      });
      bearer[user] = token;
    }
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await fixture.tearDown();
  });

  afterEach(async () => {
    await fixture.clearOverrides();
    await db.query(`DELETE FROM public.api_keys WHERE workspace_id = $1`, [fixture.workspaceId]);
  });

  describe('creating keys', () => {
    it('lets the owner create a key and shows the plaintext exactly once', async () => {
      const created = await createKey('owner', {
        name: 'ci pipeline',
        permissions: [Permission.AI_USE],
      }).expect(201);

      expect(created.body).toMatchObject({
        name: 'ci pipeline',
        permissions: ['ai:use'],
        createdBy: fixture.ids.owner,
        revokedAt: null,
      });
      expect(created.body.key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
      expect(created.body.keyPrefix).toBe(created.body.key.slice(0, 11));

      const listed = await request(app.getHttpServer()).get(keysUrl()).set(asUser('owner')).expect(200);
      expect(listed.body).toHaveLength(1);
      expect(JSON.stringify(listed.body)).not.toContain(created.body.key);
      expect(listed.body[0]).not.toHaveProperty('key');
      expect(listed.body[0]).not.toHaveProperty('keyHash');

      // Only a hash is stored.
      const row = await db.query<{ key_hash: string }>(
        `SELECT key_hash FROM public.api_keys WHERE id = $1`,
        [created.body.id],
      );
      expect(row.rows[0].key_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.rows[0].key_hash).not.toContain(created.body.key);
    });

    it('lets an admin (who holds ai:manage_keys) create keys', async () => {
      await createKey('admin', { name: 'admin key', permissions: [Permission.TASK_READ] }).expect(201);
    });

    it.each<FixtureUser>(['member', 'viewer', 'outsider'])('refuses %s', async (user) => {
      await createKey(user, { name: 'nope', permissions: [Permission.AI_USE] }).expect(403);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .post(keysUrl())
        .send({ name: 'x', permissions: [Permission.AI_USE] })
        .expect(401);
    });

    it('never grants more than the creator holds', async () => {
      // An admin cannot delete the workspace, so a key may not carry that permission either.
      await createKey('admin', {
        name: 'escalation',
        permissions: [Permission.WORKSPACE_DELETE],
      }).expect(403);
    });

    it('validates the body', async () => {
      await createKey('owner', { name: '', permissions: [Permission.AI_USE] }).expect(400);
      await createKey('owner', { name: 'x', permissions: [] }).expect(400);
      await createKey('owner', { name: 'x', permissions: ['ai:telepathy'] }).expect(400);
      await createKey('owner', { name: 'x', permissions: [Permission.AI_USE], isAdmin: true }).expect(400);
      await createKey('owner', {
        name: 'x',
        permissions: [Permission.AI_USE],
        expiresAt: '2020-01-01T00:00:00Z',
      }).expect(400);
    });
  });

  describe('using a key', () => {
    const makeKey = async (permissions: string[] = [Permission.AI_USE], user: FixtureUser = 'owner') =>
      (await createKey(user, { name: 'k', permissions }).expect(201)).body as {
        id: string;
        key: string;
      };

    it('authenticates and works inside its scope', async () => {
      const { key } = await makeKey();
      const response = await probe('ai').set('Authorization', `Bearer ${key}`).expect(200);
      expect(response.body).toEqual({ workspaceId: fixture.workspaceId });
    });

    it('is denied permissions it was not created with', async () => {
      const { key } = await makeKey([Permission.AI_USE]);
      await probe('task').set('Authorization', `Bearer ${key}`).expect(403);
    });

    it('is denied in any other workspace', async () => {
      const { key } = await makeKey();
      await probe('ai', fixture.otherWorkspaceId).set('Authorization', `Bearer ${key}`).expect(403);
      await probe('ai', randomUUID()).set('Authorization', `Bearer ${key}`).expect(403);
    });

    it('records when it was last used', async () => {
      const { key, id } = await makeKey();
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(200);

      const listed = await request(app.getHttpServer()).get(keysUrl()).set(asUser('owner')).expect(200);
      const entry = listed.body.find((k: { id: string }) => k.id === id);
      expect(entry.lastUsedAt).not.toBeNull();
    });

    it('rejects an unknown key with 401 and does not fall back to JWT parsing', async () => {
      await probe('ai').set('Authorization', 'Bearer sk_doesnotexist').expect(401);
    });

    it('stops working as soon as it is revoked, and revoking twice is fine', async () => {
      const { key, id } = await makeKey();
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(200);

      await request(app.getHttpServer()).delete(`${keysUrl()}/${id}`).set(asUser('owner')).expect(204);
      await request(app.getHttpServer()).delete(`${keysUrl()}/${id}`).set(asUser('owner')).expect(204);

      await probe('ai').set('Authorization', `Bearer ${key}`).expect(401);
    });

    it('stops working once it has expired', async () => {
      const { key, id } = await makeKey();
      await db.query(`UPDATE public.api_keys SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id]);
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(401);
    });

    it('stops working when its creator is deactivated', async () => {
      const { key } = await makeKey([Permission.AI_USE], 'admin');
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(200);

      await db.query(`UPDATE public.users SET is_active = false WHERE id = $1`, [fixture.ids.admin]);
      try {
        await probe('ai').set('Authorization', `Bearer ${key}`).expect(401);
      } finally {
        await db.query(`UPDATE public.users SET is_active = true WHERE id = $1`, [fixture.ids.admin]);
      }
    });

    it('loses power when the creator loses the permission', async () => {
      const { key } = await makeKey([Permission.AI_USE], 'admin');
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(200);

      await fixture.setOverride('admin', Permission.AI_USE, 'deny');
      await probe('ai').set('Authorization', `Bearer ${key}`).expect(403);
    });
  });

  describe('what a key can never do', () => {
    it('cannot manage keys (no key creating more keys, no listing)', async () => {
      const { key } = (
        await createKey('owner', { name: 'k', permissions: [Permission.AI_MANAGE_KEYS] }).expect(201)
      ).body;

      await request(app.getHttpServer())
        .post(keysUrl())
        .set('Authorization', `Bearer ${key}`)
        .send({ name: 'child', permissions: [Permission.AI_USE] })
        .expect(403);
      await request(app.getHttpServer()).get(keysUrl()).set('Authorization', `Bearer ${key}`).expect(403);
    });

    it('cannot call a route that declares no permission (default deny)', async () => {
      const { key } = (
        await createKey('owner', { name: 'k', permissions: [Permission.AI_USE] }).expect(201)
      ).body;

      await probe('undeclared').set('Authorization', `Bearer ${key}`).expect(403);
      // The same route stays open to a signed-in user, which is exactly why keys are denied.
      await probe('undeclared').set(asUser('owner')).expect(200);
    });

    it('cannot call authentication routes', async () => {
      const { key } = (
        await createKey('owner', { name: 'k', permissions: [Permission.AI_USE] }).expect(201)
      ).body;

      await request(app.getHttpServer())
        .get('/api/v1/authentication/me')
        .set('Authorization', `Bearer ${key}`)
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/authentication/logout-all')
        .set('Authorization', `Bearer ${key}`)
        .expect(403);
    });
  });

  describe('revoking', () => {
    it('answers 404 for a key that does not exist and 400 for a malformed id', async () => {
      await request(app.getHttpServer()).delete(`${keysUrl()}/${randomUUID()}`).set(asUser('owner')).expect(404);
      await request(app.getHttpServer()).delete(`${keysUrl()}/not-a-uuid`).set(asUser('owner')).expect(400);
    });

    it('does not let a member revoke keys', async () => {
      const { id } = (
        await createKey('owner', { name: 'k', permissions: [Permission.AI_USE] }).expect(201)
      ).body;
      await request(app.getHttpServer()).delete(`${keysUrl()}/${id}`).set(asUser('member')).expect(403);
    });
  });

  describe('workspace isolation', () => {
    it('cannot list or create keys in a workspace the user does not belong to', async () => {
      await request(app.getHttpServer()).get(keysUrl(fixture.otherWorkspaceId)).set(asUser('owner')).expect(403);
      await createKey('owner', { name: 'k', permissions: [Permission.AI_USE] }, fixture.otherWorkspaceId).expect(403);
    });
  });
});
