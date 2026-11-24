import { Permission } from '../../src/authorization';
import { WorkspacesE2e } from './helpers/workspaces-e2e';

describe('Workspace members (e2e)', () => {
  const t = new WorkspacesE2e();
  let workspaceId: string;

  const membersUrl = (id = workspaceId) => `/api/v1/workspaces/${id}/members`;
  const memberUrl = (userId: string, id = workspaceId) => `${membersUrl(id)}/${userId}`;
  const overridesUrl = (userId: string, id = workspaceId) =>
    `${memberUrl(userId, id)}/permission-overrides`;

  /** A workspace with the owner plus an admin, a member and a viewer, so each test starts clean. */
  const freshWorkspace = async (name: string): Promise<string> => {
    const id = await t.createWorkspace(name);
    await t.addMember(id, t.fixture.ids.admin, 'admin');
    await t.addMember(id, t.fixture.ids.member, 'member');
    await t.addMember(id, t.fixture.ids.viewer, 'viewer');
    return id;
  };

  beforeAll(() => t.start());
  afterAll(() => t.close());
  beforeEach(async () => {
    workspaceId = await freshWorkspace(`m${Math.random().toString(36).slice(2, 8)}`);
  });

  describe('GET /members', () => {
    it('lists every member with role and owner flag, for any member', async () => {
      const res = await t.http().get(membersUrl()).set(t.as('viewer')).expect(200);

      expect(res.body).toHaveLength(4);
      const owner = res.body.find((m: { userId: string }) => m.userId === t.fixture.ids.owner);
      expect(owner).toMatchObject({
        email: t.fixture.emails.owner,
        isOwner: true,
        role: { key: 'owner' },
      });
      const viewer = res.body.find((m: { userId: string }) => m.userId === t.fixture.ids.viewer);
      expect(viewer).toMatchObject({ isOwner: false, role: { key: 'viewer' } });
      expect(viewer).not.toHaveProperty('passwordHash');
    });

    it('is closed to people outside the workspace', async () => {
      await t.http().get(membersUrl()).set(t.as('outsider')).expect(403);
    });
  });

  describe('PATCH /members/:userId', () => {
    it('lets an admin change a member role', async () => {
      const viewerRole = await t.systemRoleId('viewer');

      const res = await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('admin'))
        .send({ roleId: viewerRole })
        .expect(200);

      expect(res.body).toMatchObject({
        userId: t.fixture.ids.member,
        role: { key: 'viewer' },
      });
    });

    it('is refused for members and viewers', async () => {
      const roleId = await t.systemRoleId('viewer');
      for (const user of ['member', 'viewer'] as const) {
        await t
          .http()
          .patch(memberUrl(t.fixture.ids.viewer))
          .set(t.as(user))
          .send({ roleId })
          .expect(403);
      }
    });

    it('never assigns the owner role', async () => {
      const ownerRole = await t.systemRoleId('owner');

      await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({ roleId: ownerRole })
        .expect(403);
    });

    it('never changes the owner, even for an admin', async () => {
      const memberRole = await t.systemRoleId('member');

      await t
        .http()
        .patch(memberUrl(t.fixture.ids.owner))
        .set(t.as('admin'))
        .send({ roleId: memberRole })
        .expect(403);
    });

    it('stops an admin from assigning a role that carries a permission they lack', async () => {
      const created = await t
        .http()
        .post(`/api/v1/workspaces/${workspaceId}/roles`)
        .set(t.as('owner'))
        .send({ name: 'Deleter', permissions: [Permission.WORKSPACE_DELETE] })
        .expect(201);

      await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('admin'))
        .send({ roleId: created.body.id })
        .expect(403);
      await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({ roleId: created.body.id })
        .expect(200);
    });

    it('is 404 for a role that does not exist or belongs to another workspace', async () => {
      const otherWorkspace = await t.createWorkspace(`o${Math.random().toString(36).slice(2, 8)}`);
      const foreign = await t
        .http()
        .post(`/api/v1/workspaces/${otherWorkspace}/roles`)
        .set(t.as('owner'))
        .send({ name: 'Foreign', permissions: [] })
        .expect(201);

      await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({ roleId: foreign.body.id })
        .expect(404);
    });

    it('is 404 for someone who is not a member, and 400 for a malformed body', async () => {
      const roleId = await t.systemRoleId('viewer');
      await t.http().patch(memberUrl(t.fixture.ids.outsider)).set(t.as('owner')).send({ roleId }).expect(404);
      await t.http().patch(memberUrl(t.fixture.ids.member)).set(t.as('owner')).send({}).expect(400);
      await t
        .http()
        .patch(memberUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({ roleId: 'nope' })
        .expect(400);
    });
  });

  describe('DELETE /members/:userId', () => {
    it('lets an admin remove a member, who then loses access', async () => {
      await t.http().delete(memberUrl(t.fixture.ids.member)).set(t.as('admin')).expect(204);

      await t.http().get(membersUrl()).set(t.as('member')).expect(403);
      const res = await t.http().get(membersUrl()).set(t.as('owner')).expect(200);
      expect(res.body).toHaveLength(3);
    });

    it('is refused for members and viewers', async () => {
      await t.http().delete(memberUrl(t.fixture.ids.viewer)).set(t.as('member')).expect(403);
      await t.http().delete(memberUrl(t.fixture.ids.member)).set(t.as('viewer')).expect(403);
    });

    it('never removes the owner', async () => {
      await t.http().delete(memberUrl(t.fixture.ids.owner)).set(t.as('admin')).expect(403);
      await t.http().delete(memberUrl(t.fixture.ids.owner)).set(t.as('owner')).expect(403);
    });

    it('also removes the permission overrides of the member', async () => {
      await t
        .http()
        .put(overridesUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.TASK_DELETE, effect: 'allow' }] })
        .expect(200);

      await t.http().delete(memberUrl(t.fixture.ids.member)).set(t.as('owner')).expect(204);

      const { rowCount } = await t.db.query(
        `SELECT 1 FROM public.member_permission_overrides WHERE workspace_id = $1`,
        [workspaceId],
      );
      expect(rowCount).toBe(0);
    });

    it('is 404 for someone who is not a member', async () => {
      await t.http().delete(memberUrl(t.fixture.ids.outsider)).set(t.as('owner')).expect(404);
    });
  });

  describe('DELETE /members/me (leave)', () => {
    it('lets any member except the owner leave', async () => {
      await t.http().delete(`${membersUrl()}/me`).set(t.as('viewer')).expect(204);

      await t.http().get(membersUrl()).set(t.as('viewer')).expect(403);
    });

    it('does not let the owner leave', async () => {
      await t.http().delete(`${membersUrl()}/me`).set(t.as('owner')).expect(403);
      await t.http().get(membersUrl()).set(t.as('owner')).expect(200);
    });

    it('is closed to non-members', async () => {
      await t.http().delete(`${membersUrl()}/me`).set(t.as('outsider')).expect(403);
    });
  });

  describe('permission overrides', () => {
    it('starts empty and stores what is put', async () => {
      await t.http().get(overridesUrl(t.fixture.ids.member)).set(t.as('owner')).expect(200, []);

      const put = await t
        .http()
        .put(overridesUrl(t.fixture.ids.member))
        .set(t.as('owner'))
        .send({
          overrides: [
            { permissionKey: Permission.TASK_DELETE, effect: 'allow' },
            { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
          ],
        })
        .expect(200);

      expect(put.body).toEqual([
        { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
        { permissionKey: Permission.TASK_DELETE, effect: 'allow' },
      ]);
    });

    it('replaces the whole set and clears it with an empty array', async () => {
      const url = overridesUrl(t.fixture.ids.member);
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.TASK_DELETE, effect: 'allow' }] })
        .expect(200);
      const replaced = await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.TASK_READ, effect: 'deny' }] })
        .expect(200);
      expect(replaced.body).toEqual([{ permissionKey: Permission.TASK_READ, effect: 'deny' }]);

      await t.http().put(url).set(t.as('owner')).send({ overrides: [] }).expect(200, []);
    });

    it('takes effect immediately: an allow opens a door, a deny closes one', async () => {
      // A viewer lacks member:update_role, so listing overrides is forbidden.
      await t.http().get(overridesUrl(t.fixture.ids.member)).set(t.as('viewer')).expect(403);
      await t
        .http()
        .put(overridesUrl(t.fixture.ids.viewer))
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.MEMBER_UPDATE_ROLE, effect: 'allow' }] })
        .expect(200);
      await t.http().get(overridesUrl(t.fixture.ids.member)).set(t.as('viewer')).expect(200);

      // An admin can update the workspace until the permission is denied.
      await t
        .http()
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set(t.as('admin'))
        .send({ name: 'Still fine' })
        .expect(200);
      await t
        .http()
        .put(overridesUrl(t.fixture.ids.admin))
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_UPDATE, effect: 'deny' }] })
        .expect(200);
      await t
        .http()
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set(t.as('admin'))
        .send({ name: 'Blocked' })
        .expect(403);
    });

    it('stops anyone granting a permission they do not hold, but allows denying it', async () => {
      const url = overridesUrl(t.fixture.ids.member);
      // The admin role lacks workspace:delete.
      await t
        .http()
        .put(url)
        .set(t.as('admin'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'allow' }] })
        .expect(403);
      await t
        .http()
        .put(url)
        .set(t.as('admin'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'deny' }] })
        .expect(200);
    });

    it('treats lifting a deny as a grant: only someone who holds the permission may do it', async () => {
      const url = overridesUrl(t.fixture.ids.member);
      // The admin role lacks workspace:delete, so the admin may not give it back.
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'deny' }] })
        .expect(200);

      await t.http().put(url).set(t.as('admin')).send({ overrides: [] }).expect(403);
      await t.http().delete(`${url}/${Permission.WORKSPACE_DELETE}`).set(t.as('admin')).expect(403);
      await t
        .http()
        .put(url)
        .set(t.as('admin'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'allow' }] })
        .expect(403);

      // Keeping the deny is fine, and the owner holds everything.
      await t
        .http()
        .put(url)
        .set(t.as('admin'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'deny' }] })
        .expect(200);
      await t.http().delete(`${url}/${Permission.WORKSPACE_DELETE}`).set(t.as('owner')).expect(204);
    });

    it('does not let anyone clear a restriction on themselves or change their own role', async () => {
      await t
        .http()
        .put(overridesUrl(t.fixture.ids.admin))
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.WORKSPACE_UPDATE, effect: 'deny' }] })
        .expect(200);

      await t.http().put(overridesUrl(t.fixture.ids.admin)).set(t.as('admin')).send({ overrides: [] }).expect(403);
      await t
        .http()
        .delete(`${overridesUrl(t.fixture.ids.admin)}/${Permission.WORKSPACE_UPDATE}`)
        .set(t.as('admin'))
        .expect(403);
      await t
        .http()
        .patch(memberUrl(t.fixture.ids.admin))
        .set(t.as('admin'))
        .send({ roleId: await t.systemRoleId('member') })
        .expect(403);
      await t
        .http()
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set(t.as('admin'))
        .send({ name: 'Still blocked' })
        .expect(403);
    });

    it('is refused for members and viewers', async () => {
      await t.http().put(overridesUrl(t.fixture.ids.viewer)).set(t.as('member')).send({ overrides: [] }).expect(403);
    });

    it('does not apply to the owner', async () => {
      await t
        .http()
        .put(overridesUrl(t.fixture.ids.owner))
        .set(t.as('admin'))
        .send({ overrides: [{ permissionKey: Permission.TASK_READ, effect: 'deny' }] })
        .expect(403);
    });

    it('rejects duplicates, unknown permissions and unknown effects', async () => {
      const url = overridesUrl(t.fixture.ids.member);
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({
          overrides: [
            { permissionKey: Permission.TASK_READ, effect: 'allow' },
            { permissionKey: Permission.TASK_READ, effect: 'deny' },
          ],
        })
        .expect(400);
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: 'task:fly', effect: 'allow' }] })
        .expect(400);
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.TASK_READ, effect: 'maybe' }] })
        .expect(400);
    });

    it('removes a single override, and is 404 when there is none', async () => {
      const url = overridesUrl(t.fixture.ids.member);
      await t
        .http()
        .put(url)
        .set(t.as('owner'))
        .send({ overrides: [{ permissionKey: Permission.TASK_DELETE, effect: 'allow' }] })
        .expect(200);

      await t.http().delete(`${url}/${Permission.TASK_DELETE}`).set(t.as('owner')).expect(204);
      await t.http().delete(`${url}/${Permission.TASK_DELETE}`).set(t.as('owner')).expect(404);
      await t.http().delete(`${url}/task:fly`).set(t.as('owner')).expect(400);
    });

    it('is 404 for someone who is not a member', async () => {
      await t.http().get(overridesUrl(t.fixture.ids.outsider)).set(t.as('owner')).expect(404);
    });
  });

  describe('API keys', () => {
    it('may list members with workspace:read, but cannot change them', async () => {
      const created = await t
        .http()
        .post(`/api/v1/workspaces/${workspaceId}/api-keys`)
        .set(t.as('owner'))
        .send({ name: 'members e2e', permissions: ['workspace:read', 'member:remove'] })
        .expect(201);
      const key = { Authorization: `Bearer ${created.body.key}` };

      await t.http().get(membersUrl()).set(key).expect(200);
      await t.http().delete(memberUrl(t.fixture.ids.viewer)).set(key).expect(403);
      await t.http().delete(`${membersUrl()}/me`).set(key).expect(403);
    });
  });
});
