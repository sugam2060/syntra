import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TokenService } from '../../src/authentication/token.service';
import { FixtureUser, WorkspaceFixture } from '../authorization/helpers/workspace-fixture';

describe('Workspaces (e2e)', () => {
  const fixture = new WorkspaceFixture();
  const bearer = {} as Record<FixtureUser, string>;
  let app: INestApplication;

  // Fixture teardown removes workspaces whose slug matches `perm-%<runId>`.
  const slug = (name: string) => `perm-${name}-${fixture.runId}`;
  const as = (user: FixtureUser) => ({ Authorization: `Bearer ${bearer[user]}` });
  const http = () => request(app.getHttpServer());

  const create = (user: FixtureUser, name: string, body: Record<string, unknown> = {}) =>
    http()
      .post('/api/v1/workspaces')
      .set(as(user))
      .send({ name: `Workspace ${name}`, slug: slug(name), ...body });

  beforeAll(async () => {
    Object.assign(process.env, { THROTTLE_LIMIT: '1000', AUTH_THROTTLE_LIMIT: '1000' });
    await fixture.setUp();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    await fixture.tearDown();
  });

  describe('POST /workspaces', () => {
    it('creates a workspace owned by the caller', async () => {
      const res = await create('outsider', 'created').expect(201);

      expect(res.body).toMatchObject({
        name: 'Workspace created',
        slug: slug('created'),
        ownerId: fixture.ids.outsider,
        role: { key: 'owner' },
      });
      expect(res.body.id).toEqual(expect.any(String));
    });

    it('normalises the slug to lowercase and trims the name', async () => {
      const res = await create('outsider', 'normal', {
        name: '  Padded  ',
        slug: slug('normal').toUpperCase(),
      }).expect(201);

      expect(res.body).toMatchObject({ name: 'Padded', slug: slug('normal') });
    });

    it('answers 409 when the slug is taken, even by a workspace the caller cannot see', async () => {
      const res = await create('outsider', 'dup', { slug: `perm-${fixture.runId}` }).expect(409);

      expect(res.body.message).toBe('That URL is already in use');
    });

    it.each(['admin', 'settings', 'api'])('rejects the reserved slug %s', async (reserved) => {
      await create('owner', 'reserved', { slug: reserved }).expect(400);
    });

    it.each([
      ['too short', 'ab'],
      ['spaces', 'my workspace'],
      ['leading hyphen', '-abc'],
      ['double hyphen', 'a--b'],
    ])('rejects a malformed slug (%s)', async (_label, bad) => {
      await create('owner', 'bad', { slug: bad }).expect(400);
    });

    it('rejects a missing name and unknown fields', async () => {
      await http().post('/api/v1/workspaces').set(as('owner')).send({ slug: slug('x') }).expect(400);
      await create('owner', 'extra', { ownerId: fixture.ids.admin }).expect(400);
    });

    it('requires authentication', async () => {
      await http().post('/api/v1/workspaces').send({ name: 'x', slug: slug('anon') }).expect(401);
    });
  });

  describe('GET /workspaces', () => {
    it('lists only workspaces the caller belongs to, with their role', async () => {
      const res = await http().get('/api/v1/workspaces').set(as('viewer')).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: fixture.workspaceId,
        role: { key: 'viewer' },
      });
    });

    it('does not leak other tenants', async () => {
      const res = await http().get('/api/v1/workspaces').set(as('outsider')).expect(200);

      const ids = res.body.map((w: { id: string }) => w.id);
      expect(ids).toContain(fixture.otherWorkspaceId);
      expect(ids).not.toContain(fixture.workspaceId);
    });
  });

  describe('GET /workspaces/slug-availability', () => {
    const check = (value: string, user: FixtureUser = 'member') =>
      http().get('/api/v1/workspaces/slug-availability').query({ slug: value }).set(as(user));

    it('reports a free slug as available', async () => {
      const res = await check(slug('free')).expect(200);
      expect(res.body).toEqual({ slug: slug('free'), available: true, reason: null });
    });

    it('reports a slug as taken even when the caller is not a member', async () => {
      const res = await check(`perm-${fixture.runId}`, 'outsider').expect(200);
      expect(res.body).toMatchObject({ available: false, reason: 'taken' });
    });

    it('reports reserved and malformed slugs with a reason instead of an error', async () => {
      expect((await check('admin').expect(200)).body).toMatchObject({
        available: false,
        reason: 'reserved',
      });
      expect((await check('No Good').expect(200)).body).toMatchObject({
        available: false,
        reason: 'invalid',
      });
    });

    it('requires authentication', async () => {
      await http().get('/api/v1/workspaces/slug-availability').query({ slug: 'abc' }).expect(401);
    });
  });

  describe('GET /workspaces/by-slug/:slug', () => {
    it('resolves a slug to the workspace for a member', async () => {
      const res = await http()
        .get(`/api/v1/workspaces/by-slug/perm-${fixture.runId}`)
        .set(as('member'))
        .expect(200);

      expect(res.body).toMatchObject({ id: fixture.workspaceId, role: { key: 'member' } });
    });

    it('is case-insensitive', async () => {
      await http()
        .get(`/api/v1/workspaces/by-slug/PERM-${fixture.runId}`)
        .set(as('member'))
        .expect(200);
    });

    it('answers 404 for a non-member, indistinguishable from a missing slug', async () => {
      const outsider = await http()
        .get(`/api/v1/workspaces/by-slug/perm-${fixture.runId}`)
        .set(as('outsider'))
        .expect(404);
      const missing = await http()
        .get(`/api/v1/workspaces/by-slug/perm-missing-${fixture.runId}`)
        .set(as('outsider'))
        .expect(404);

      expect(outsider.body).toEqual(missing.body);
    });
  });

  describe('GET /workspaces/:workspaceId', () => {
    it.each(['owner', 'admin', 'member', 'viewer'] as const)('lets the %s read it', async (user) => {
      const res = await http()
        .get(`/api/v1/workspaces/${fixture.workspaceId}`)
        .set(as(user))
        .expect(200);
      expect(res.body).toMatchObject({ id: fixture.workspaceId, role: { key: user } });
    });

    it('answers 403 to a non-member', async () => {
      await http()
        .get(`/api/v1/workspaces/${fixture.workspaceId}`)
        .set(as('outsider'))
        .expect(403);
    });

    it('answers 400 for an id that is not a uuid', async () => {
      await http().get('/api/v1/workspaces/not-a-uuid').set(as('owner')).expect(400);
    });
  });

  describe('PATCH /workspaces/:workspaceId', () => {
    it('lets the owner rename and re-slug a workspace', async () => {
      const created = (await create('owner', 'patch').expect(201)).body;

      const res = await http()
        .patch(`/api/v1/workspaces/${created.id}`)
        .set(as('owner'))
        .send({ name: 'Renamed', slug: slug('patched') })
        .expect(200);

      expect(res.body).toMatchObject({ id: created.id, name: 'Renamed', slug: slug('patched') });
      await http()
        .get(`/api/v1/workspaces/by-slug/${slug('patched')}`)
        .set(as('owner'))
        .expect(200);
      await http().get(`/api/v1/workspaces/by-slug/${slug('patch')}`).set(as('owner')).expect(404);
    });

    it('lets an admin update (workspace:update) but not a member or viewer', async () => {
      await http()
        .patch(`/api/v1/workspaces/${fixture.workspaceId}`)
        .set(as('admin'))
        .send({ name: 'Permission fixture' })
        .expect(200);
      for (const user of ['member', 'viewer', 'outsider'] as const) {
        await http()
          .patch(`/api/v1/workspaces/${fixture.workspaceId}`)
          .set(as(user))
          .send({ name: 'Hacked' })
          .expect(403);
      }
    });

    it('answers 409 when the new slug is taken', async () => {
      const created = (await create('owner', 'patch2').expect(201)).body;

      await http()
        .patch(`/api/v1/workspaces/${created.id}`)
        .set(as('owner'))
        .send({ slug: `perm-${fixture.runId}` })
        .expect(409);
    });

    it('rejects an empty body, a reserved slug and an owner change', async () => {
      const url = `/api/v1/workspaces/${fixture.workspaceId}`;
      await http().patch(url).set(as('owner')).send({}).expect(400);
      await http().patch(url).set(as('owner')).send({ slug: 'admin' }).expect(400);
      await http().patch(url).set(as('owner')).send({ ownerId: fixture.ids.admin }).expect(400);
    });
  });

  describe('DELETE /workspaces/:workspaceId', () => {
    it('is owner-only: an admin lacks workspace:delete', async () => {
      const created = (await create('owner', 'del').expect(201)).body;

      await http().delete(`/api/v1/workspaces/${created.id}`).set(as('admin')).expect(403);
      await http().get(`/api/v1/workspaces/${created.id}`).set(as('owner')).expect(200);
    });

    it('deletes the workspace for the owner', async () => {
      const created = (await create('owner', 'del2').expect(201)).body;

      await http().delete(`/api/v1/workspaces/${created.id}`).set(as('owner')).expect(204);

      await http().get(`/api/v1/workspaces/${created.id}`).set(as('owner')).expect(403);
      const mine = await http().get('/api/v1/workspaces').set(as('owner')).expect(200);
      expect(mine.body.map((w: { id: string }) => w.id)).not.toContain(created.id);
    });
  });

  describe('API keys', () => {
    let key: string;

    beforeAll(async () => {
      const res = await http()
        .post(`/api/v1/workspaces/${fixture.workspaceId}/api-keys`)
        .set(as('owner'))
        .send({ name: 'workspaces e2e', permissions: ['workspace:read', 'workspace:update'] })
        .expect(201);
      key = res.body.key;
    });

    const withKey = () => ({ Authorization: `Bearer ${key}` });

    it('can read the workspace it belongs to', async () => {
      await http()
        .get(`/api/v1/workspaces/${fixture.workspaceId}`)
        .set(withKey())
        .expect(200);
    });

    it('cannot create, list, rename or delete workspaces, even holding workspace:update', async () => {
      await http()
        .post('/api/v1/workspaces')
        .set(withKey())
        .send({ name: 'x', slug: slug('key') })
        .expect(403);
      await http().get('/api/v1/workspaces').set(withKey()).expect(403);
      await http()
        .patch(`/api/v1/workspaces/${fixture.workspaceId}`)
        .set(withKey())
        .send({ name: 'x' })
        .expect(403);
      await http().delete(`/api/v1/workspaces/${fixture.workspaceId}`).set(withKey()).expect(403);
    });

    it('cannot read another workspace', async () => {
      await http()
        .get(`/api/v1/workspaces/${fixture.otherWorkspaceId}`)
        .set(withKey())
        .expect(403);
    });
  });
});
