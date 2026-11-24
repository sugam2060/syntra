import { PERMISSION_KEYS, Permission } from '../../src/authorization';
import { WorkspacesE2e } from './helpers/workspaces-e2e';

describe('Workspace roles (e2e)', () => {
  const t = new WorkspacesE2e();
  let workspaceId: string;

  const rolesUrl = (id = workspaceId) => `/api/v1/workspaces/${id}/roles`;

  beforeAll(() => t.start());
  afterAll(() => t.close());
  beforeEach(async () => {
    workspaceId = await t.createWorkspace(`r${Math.random().toString(36).slice(2, 8)}`);
    await t.addMember(workspaceId, t.fixture.ids.admin, 'admin');
    await t.addMember(workspaceId, t.fixture.ids.member, 'member');
    await t.addMember(workspaceId, t.fixture.ids.viewer, 'viewer');
  });

  const createRole = (user: 'owner' | 'admin' | 'member', body: Record<string, unknown>) =>
    t.http().post(rolesUrl()).set(t.as(user)).send(body);

  describe('GET /roles and /permissions', () => {
    it('lists the built-in roles with their permissions for any member', async () => {
      const res = await t.http().get(rolesUrl()).set(t.as('viewer')).expect(200);

      const byKey = Object.fromEntries(res.body.map((r: { key: string }) => [r.key, r]));
      expect(Object.keys(byKey)).toEqual(expect.arrayContaining(['owner', 'admin', 'member', 'viewer']));
      expect(byKey.owner).toMatchObject({ isSystem: true });
      expect(byKey.owner.permissions).toHaveLength(PERMISSION_KEYS.length);
      expect(byKey.admin.permissions).not.toContain(Permission.WORKSPACE_DELETE);
      expect(byKey.viewer.permissions).toHaveLength(3);
      expect(byKey.viewer.permissions).toEqual(
        expect.arrayContaining([
          Permission.PROJECT_READ,
          Permission.TASK_READ,
          Permission.WORKSPACE_READ,
        ]),
      );
    });

    it('includes custom roles of this workspace only', async () => {
      const created = await createRole('owner', { name: 'QA Lead', permissions: [Permission.TASK_READ] }).expect(201);
      const other = await t.createWorkspace(`q${Math.random().toString(36).slice(2, 8)}`);

      const here = await t.http().get(rolesUrl()).set(t.as('owner')).expect(200);
      const there = await t.http().get(rolesUrl(other)).set(t.as('owner')).expect(200);

      expect(here.body.map((r: { id: string }) => r.id)).toContain(created.body.id);
      expect(there.body.map((r: { id: string }) => r.id)).not.toContain(created.body.id);
    });

    it('lists the permission catalogue', async () => {
      const res = await t
        .http()
        .get(`/api/v1/workspaces/${workspaceId}/permissions`)
        .set(t.as('viewer'))
        .expect(200);

      const keys = res.body.map((p: { key: string }) => p.key);
      expect(keys).toHaveLength(PERMISSION_KEYS.length);
      expect(keys).toEqual(expect.arrayContaining([...PERMISSION_KEYS]));
      expect(res.body[0]).toEqual({ key: expect.any(String), description: expect.any(String) });
    });

    it('is closed to people outside the workspace', async () => {
      await t.http().get(rolesUrl()).set(t.as('outsider')).expect(403);
    });
  });

  describe('POST /roles', () => {
    it('creates a custom role and derives its key from the name', async () => {
      const res = await createRole('owner', {
        name: 'Release Manager',
        permissions: [Permission.TASK_READ, Permission.TASK_UPDATE],
      }).expect(201);

      expect(res.body).toMatchObject({
        key: 'release-manager',
        name: 'Release Manager',
        isSystem: false,
      });
      expect(res.body.permissions).toHaveLength(2);
      expect(res.body.permissions).toEqual(
        expect.arrayContaining([Permission.TASK_READ, Permission.TASK_UPDATE]),
      );
    });

    it('lets an admin create roles, but not members or viewers', async () => {
      await createRole('admin', { name: 'By admin', permissions: [] }).expect(201);
      await createRole('member', { name: 'By member', permissions: [] }).expect(403);
    });

    it('stops an admin from putting a permission they lack into a role', async () => {
      await createRole('admin', { name: 'Escalation', permissions: [Permission.WORKSPACE_DELETE] }).expect(403);
    });

    it('answers 409 for a duplicate name and for built-in role names', async () => {
      await createRole('owner', { name: 'Support', permissions: [] }).expect(201);
      await createRole('owner', { name: 'support', permissions: [] }).expect(409);
      await createRole('owner', { name: 'Admin', permissions: [] }).expect(409);
      await createRole('owner', { name: 'OWNER', permissions: [] }).expect(409);
    });

    it('rejects bad input', async () => {
      await createRole('owner', { name: '***', permissions: [] }).expect(400);
      await createRole('owner', { name: '', permissions: [] }).expect(400);
      await createRole('owner', { name: 'X', permissions: ['task:fly'] }).expect(400);
      await createRole('owner', { name: 'X', permissions: [Permission.TASK_READ, Permission.TASK_READ] }).expect(400);
      await createRole('owner', { name: 'X' }).expect(400);
      await createRole('owner', { name: 'X', permissions: [], isSystem: true }).expect(400);
    });
  });

  describe('PATCH /roles/:roleId', () => {
    it('renames a role without changing its key, and replaces its permissions', async () => {
      const created = await createRole('owner', { name: 'Tester', permissions: [Permission.TASK_READ] }).expect(201);

      const res = await t
        .http()
        .patch(`${rolesUrl()}/${created.body.id}`)
        .set(t.as('owner'))
        .send({ name: 'Senior Tester', permissions: [Permission.TASK_READ, Permission.COMMENT_CREATE] })
        .expect(200);

      expect(res.body).toMatchObject({ id: created.body.id, key: 'tester', name: 'Senior Tester' });
      expect(res.body.permissions).toHaveLength(2);
      expect(res.body.permissions).toEqual(
        expect.arrayContaining([Permission.COMMENT_CREATE, Permission.TASK_READ]),
      );
    });

    it('can clear every permission', async () => {
      const created = await createRole('owner', { name: 'Empty me', permissions: [Permission.TASK_READ] }).expect(201);

      const res = await t
        .http()
        .patch(`${rolesUrl()}/${created.body.id}`)
        .set(t.as('owner'))
        .send({ permissions: [] })
        .expect(200);

      expect(res.body.permissions).toEqual([]);
    });

    it('does not touch built-in roles', async () => {
      const roles = await t.http().get(rolesUrl()).set(t.as('owner')).expect(200);
      const viewer = roles.body.find((r: { key: string }) => r.key === 'viewer');

      await t.http().patch(`${rolesUrl()}/${viewer.id}`).set(t.as('owner')).send({ name: 'Hacked' }).expect(403);
    });

    it('stops an admin from adding a permission they lack, and rejects an empty update', async () => {
      const created = await createRole('owner', { name: 'Guarded', permissions: [] }).expect(201);
      const url = `${rolesUrl()}/${created.body.id}`;

      await t.http().patch(url).set(t.as('admin')).send({ permissions: [Permission.WORKSPACE_DELETE] }).expect(403);
      await t.http().patch(url).set(t.as('owner')).send({}).expect(400);
    });

    it('is 404 for an unknown role and for a role of another workspace', async () => {
      const other = await t.createWorkspace(`z${Math.random().toString(36).slice(2, 8)}`);
      const foreign = await t
        .http()
        .post(rolesUrl(other))
        .set(t.as('owner'))
        .send({ name: 'Foreign', permissions: [] })
        .expect(201);

      await t.http().patch(`${rolesUrl()}/${foreign.body.id}`).set(t.as('owner')).send({ name: 'x' }).expect(404);
      await t
        .http()
        .patch(`${rolesUrl()}/0192b1c4-0000-7000-8000-000000000000`)
        .set(t.as('owner'))
        .send({ name: 'x' })
        .expect(404);
    });
  });

  describe('DELETE /roles/:roleId', () => {
    it('deletes an unused custom role', async () => {
      const created = await createRole('owner', { name: 'Temporary', permissions: [] }).expect(201);

      await t.http().delete(`${rolesUrl()}/${created.body.id}`).set(t.as('owner')).expect(204);

      const roles = await t.http().get(rolesUrl()).set(t.as('owner')).expect(200);
      expect(roles.body.map((r: { id: string }) => r.id)).not.toContain(created.body.id);
    });

    it('answers 409 while a member or a pending invitation uses the role', async () => {
      const created = await createRole('owner', { name: 'In use', permissions: [Permission.TASK_READ] }).expect(201);
      await t
        .http()
        .patch(`/api/v1/workspaces/${workspaceId}/members/${t.fixture.ids.member}`)
        .set(t.as('owner'))
        .send({ roleId: created.body.id })
        .expect(200);
      await t.http().delete(`${rolesUrl()}/${created.body.id}`).set(t.as('owner')).expect(409);

      await t
        .http()
        .patch(`/api/v1/workspaces/${workspaceId}/members/${t.fixture.ids.member}`)
        .set(t.as('owner'))
        .send({ roleId: await t.systemRoleId('member') })
        .expect(200);
      await t
        .http()
        .post(`/api/v1/workspaces/${workspaceId}/invitations`)
        .set(t.as('owner'))
        .send({ emails: [t.fixture.emails.outsider], roleId: created.body.id })
        .expect(201);
      await t.http().delete(`${rolesUrl()}/${created.body.id}`).set(t.as('owner')).expect(409);
    });

    it('does not delete built-in roles and is refused for members', async () => {
      const roles = await t.http().get(rolesUrl()).set(t.as('owner')).expect(200);
      const viewer = roles.body.find((r: { key: string }) => r.key === 'viewer');
      const created = await createRole('owner', { name: 'Protected', permissions: [] }).expect(201);

      await t.http().delete(`${rolesUrl()}/${viewer.id}`).set(t.as('owner')).expect(403);
      await t.http().delete(`${rolesUrl()}/${created.body.id}`).set(t.as('member')).expect(403);
    });

    it('is 404 when the role does not exist', async () => {
      await t
        .http()
        .delete(`${rolesUrl()}/0192b1c4-0000-7000-8000-000000000000`)
        .set(t.as('owner'))
        .expect(404);
    });
  });
});
