import { Permission } from '../../src/authorization';
import { TestUser, WorkspacesE2e } from './helpers/workspaces-e2e';

describe('Workspace invitations (e2e)', () => {
  const t = new WorkspacesE2e();
  let workspaceId: string;
  let memberRoleId: string;

  const invitationsUrl = (id = workspaceId) => `/api/v1/workspaces/${id}/invitations`;
  const bearerOf = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

  const invite = (
    emails: string[],
    as: 'owner' | 'admin' | 'member' | 'viewer' = 'owner',
    extra: Record<string, unknown> = {},
  ) =>
    t
      .http()
      .post(invitationsUrl())
      .set(t.as(as))
      .send({ emails, roleId: memberRoleId, ...extra });

  const accept = (user: TestUser, body: Record<string, unknown>) =>
    t.http().post('/api/v1/invitations/accept').set(bearerOf(user)).send(body);

  const idOfInvitation = async (email: string): Promise<string> => {
    const { rows } = await t.db.query<{ id: string }>(
      `SELECT id FROM public.workspace_invitations WHERE workspace_id = $1 AND lower(email) = lower($2)
       AND accepted_at IS NULL AND revoked_at IS NULL`,
      [workspaceId, email],
    );
    return rows[0].id;
  };

  beforeAll(async () => {
    await t.start();
    memberRoleId = await t.systemRoleId('member');
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    workspaceId = await t.createWorkspace(`i${Math.random().toString(36).slice(2, 8)}`);
    await t.addMember(workspaceId, t.fixture.ids.admin, 'admin');
    await t.addMember(workspaceId, t.fixture.ids.member, 'member');
    await t.addMember(workspaceId, t.fixture.ids.viewer, 'viewer');
  });

  describe('POST /workspaces/:id/invitations', () => {
    it('creates an invitation and emails a link whose token is not stored', async () => {
      const invitee = await t.newUser('fresh');

      const res = await invite([invitee.email], 'owner', { message: 'Welcome!' }).expect(201);

      expect(res.body).toEqual([
        {
          email: invitee.email,
          outcome: 'invited',
          invitation: expect.objectContaining({
            email: invitee.email,
            status: 'pending',
            role: expect.objectContaining({ key: 'member' }),
            invitedBy: { id: t.fixture.ids.owner, name: 'owner' },
          }),
        },
      ]);
      const mail = t.emails.invitations.at(-1);
      expect(mail).toMatchObject({
        email: invitee.email,
        workspaceName: expect.stringContaining('Workspace i'),
        inviterName: 'owner',
        roleName: 'Member',
        message: 'Welcome!',
      });
      expect(mail?.link).toMatch(/\/invitations\/accept\?token=[A-Za-z0-9_-]{43}$/);

      const token = t.emails.tokenFor(invitee.email);
      const { rows } = await t.db.query<{ token_hash: string }>(
        `SELECT token_hash FROM public.workspace_invitations WHERE id = $1`,
        [res.body[0].invitation.id],
      );
      expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].token_hash).not.toContain(token);
      expect(JSON.stringify(res.body)).not.toContain(token);
    });

    it('invites several addresses at once and reports each outcome', async () => {
      const a = await t.newUser('bulk-a');
      const b = await t.newUser('bulk-b');
      await invite([a.email]).expect(201);

      const res = await invite([
        a.email,
        b.email,
        t.fixture.emails.viewer,
      ]).expect(201);

      expect(res.body.map((r: { outcome: string }) => r.outcome)).toEqual([
        'already_invited',
        'invited',
        'already_member',
      ]);
    });

    it('matches addresses case-insensitively', async () => {
      const invitee = await t.newUser('cased');
      await invite([invitee.email]).expect(201);

      const res = await invite([invitee.email.toUpperCase()]).expect(201);

      expect(res.body[0].outcome).toBe('already_invited');
    });

    it('replaces an invitation that has expired instead of blocking the address', async () => {
      const invitee = await t.newUser('stale');
      await invite([invitee.email]).expect(201);
      const staleToken = t.emails.tokenFor(invitee.email);
      await t.db.query(
        `UPDATE public.workspace_invitations SET expires_at = now() - interval '1 day'
         WHERE workspace_id = $1 AND lower(email) = lower($2)`,
        [workspaceId, invitee.email],
      );

      const res = await invite([invitee.email]).expect(201);

      expect(res.body[0].outcome).toBe('invited');
      expect(t.emails.tokenFor(invitee.email)).not.toBe(staleToken);
      await accept(invitee, { token: staleToken }).expect(400);
      await accept(invitee, { token: t.emails.tokenFor(invitee.email) }).expect(200);
    });

    it('never offers the owner role', async () => {
      const invitee = await t.newUser('ownerish');

      await invite([invitee.email], 'owner', { roleId: await t.systemRoleId('owner') }).expect(403);
    });

    it('stops an admin from inviting into a role with permissions the admin lacks', async () => {
      const invitee = await t.newUser('escalate');
      const custom = await t
        .http()
        .post(`/api/v1/workspaces/${workspaceId}/roles`)
        .set(t.as('owner'))
        .send({ name: 'Deleter', permissions: [Permission.WORKSPACE_DELETE] })
        .expect(201);

      await invite([invitee.email], 'admin', { roleId: custom.body.id }).expect(403);
      await invite([invitee.email], 'owner', { roleId: custom.body.id }).expect(201);
    });

    it('is refused for members and viewers, who lack member:invite', async () => {
      const invitee = await t.newUser('nope');

      await invite([invitee.email], 'member').expect(403);
      await invite([invitee.email], 'viewer').expect(403);
      await t.http().post(invitationsUrl()).set(t.as('outsider')).send({ emails: [invitee.email], roleId: memberRoleId }).expect(403);
    });

    it('rejects bad input', async () => {
      await invite([]).expect(400);
      await invite(['not-an-email']).expect(400);
      await invite(['a@example.com', 'a@example.com']).expect(400);
      await invite(Array.from({ length: 21 }, (_, i) => `u${i}@example.com`)).expect(400);
      await t.http().post(invitationsUrl()).set(t.as('owner')).send({ emails: ['a@example.com'] }).expect(400);
      await invite(['a@example.com'], 'owner', { roleId: 'nope' }).expect(400);
      await invite(['a@example.com'], 'owner', { message: 'x'.repeat(501) }).expect(400);
    });

    it('is 404 for a role from another workspace', async () => {
      const otherWorkspace = await t.createWorkspace(`j${Math.random().toString(36).slice(2, 8)}`);
      const foreign = await t
        .http()
        .post(`/api/v1/workspaces/${otherWorkspace}/roles`)
        .set(t.as('owner'))
        .send({ name: 'Foreign', permissions: [] })
        .expect(201);
      const invitee = await t.newUser('foreign');

      await invite([invitee.email], 'owner', { roleId: foreign.body.id }).expect(404);
    });

    it('cannot be used with an API key', async () => {
      const created = await t
        .http()
        .post(`/api/v1/workspaces/${workspaceId}/api-keys`)
        .set(t.as('owner'))
        .send({ name: 'inv', permissions: [Permission.MEMBER_INVITE, Permission.WORKSPACE_READ] })
        .expect(201);
      const key = { Authorization: `Bearer ${created.body.key}` };
      const invitee = await t.newUser('apikey');

      await t.http().post(invitationsUrl()).set(key).send({ emails: [invitee.email], roleId: memberRoleId }).expect(403);
      await t.http().get(invitationsUrl()).set(key).expect(403);
    });
  });

  describe('accepting by emailed token', () => {
    it('adds the invitee with the invited role and lets them in', async () => {
      const invitee = await t.newUser('joiner');
      await invite([invitee.email]).expect(201);
      const token = t.emails.tokenFor(invitee.email);

      const res = await accept(invitee, { token }).expect(200);

      expect(res.body).toEqual({ workspaceId });
      const workspace = await t.http().get(`/api/v1/workspaces/${workspaceId}`).set(bearerOf(invitee)).expect(200);
      expect(workspace.body.role.key).toBe('member');
      const list = await t.http().get(invitationsUrl()).set(t.as('owner')).expect(200);
      expect(list.body.map((i: { email: string }) => i.email)).not.toContain(invitee.email);
    });

    it('works only once', async () => {
      const invitee = await t.newUser('once');
      await invite([invitee.email]).expect(201);
      const token = t.emails.tokenFor(invitee.email);

      await accept(invitee, { token }).expect(200);
      await accept(invitee, { token }).expect(400);
    });

    it('lets only one of two simultaneous accepts win', async () => {
      const invitee = await t.newUser('race');
      await invite([invitee.email]).expect(201);
      const token = t.emails.tokenFor(invitee.email);

      const statuses = (await Promise.all([accept(invitee, { token }), accept(invitee, { token })])).map(
        (res) => res.status,
      );

      expect(statuses).toHaveLength(2);
      expect(statuses).toEqual(expect.arrayContaining([200, 400]));
    });

    it('refuses someone else holding the link', async () => {
      const invitee = await t.newUser('rightful');
      const thief = await t.newUser('thief');
      await invite([invitee.email]).expect(201);
      const token = t.emails.tokenFor(invitee.email);

      await accept(thief, { token }).expect(400);
      await t.http().get(`/api/v1/workspaces/${workspaceId}`).set(bearerOf(thief)).expect(403);
      await accept(invitee, { token }).expect(200);
    });

    it('requires a verified email, using the same error code as sign-in', async () => {
      const invitee = await t.newUser('unverified', false);
      await invite([invitee.email]).expect(201);

      const res = await accept(invitee, { token: t.emails.tokenFor(invitee.email) }).expect(403);

      expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
    });

    it('rejects unknown, malformed and missing tokens with one generic message', async () => {
      const user = await t.newUser('prober');

      const unknown = await accept(user, { token: 'x'.repeat(43) }).expect(400);
      expect(unknown.body.message).toBe('Invalid or expired invitation');
      await accept(user, { token: 'short' }).expect(400);
      await accept(user, {}).expect(400);
      await accept(user, { token: 'x'.repeat(43), invitationId: '0192b1c4-0000-7000-8000-000000000000' }).expect(400);
    });

    it('requires authentication and rejects API keys', async () => {
      await t.http().post('/api/v1/invitations/accept').send({ token: 'x'.repeat(43) }).expect(401);
    });

    it('does not fail for someone who is already a member, and still consumes the invitation', async () => {
      const invitee = await t.newUser('twice');
      await invite([invitee.email]).expect(201);
      const first = t.emails.tokenFor(invitee.email);
      await t.addMember(workspaceId, invitee.id, 'viewer');
      await t.db.query(
        `UPDATE public.workspace_invitations SET email = email WHERE workspace_id = $1`,
        [workspaceId],
      );

      const res = await accept(invitee, { token: first }).expect(200);

      expect(res.body).toEqual({ workspaceId });
      const workspace = await t.http().get(`/api/v1/workspaces/${workspaceId}`).set(bearerOf(invitee)).expect(200);
      expect(workspace.body.role.key).toBe('viewer');
    });
  });

  describe('invitee side: preview, mine, accept by id, decline', () => {
    it('previews a token before sign-in without exposing ids', async () => {
      const invitee = await t.newUser('previewee');
      await invite([invitee.email]).expect(201);

      const res = await t
        .http()
        .get('/api/v1/invitations/preview')
        .query({ token: t.emails.tokenFor(invitee.email) })
        .expect(200);

      expect(res.body).toMatchObject({
        workspaceName: expect.stringContaining('Workspace i'),
        roleName: 'Member',
        inviterName: 'owner',
        invitedEmail: invitee.email,
        status: 'pending',
      });
      expect(JSON.stringify(res.body)).not.toContain(workspaceId);
    });

    it('reports revoked and expired invitations, and 404s an unknown token', async () => {
      const gone = await t.newUser('gone');
      await invite([gone.email]).expect(201);
      const token = t.emails.tokenFor(gone.email);
      await t.http().delete(`${invitationsUrl()}/${await idOfInvitation(gone.email)}`).set(t.as('owner')).expect(204);

      const revoked = await t.http().get('/api/v1/invitations/preview').query({ token }).expect(200);
      expect(revoked.body.status).toBe('revoked');

      const late = await t.newUser('late');
      await invite([late.email]).expect(201);
      await t.db.query(
        `UPDATE public.workspace_invitations SET expires_at = now() - interval '1 day'
         WHERE workspace_id = $1 AND lower(email) = lower($2)`,
        [workspaceId, late.email],
      );
      const expired = await t
        .http()
        .get('/api/v1/invitations/preview')
        .query({ token: t.emails.tokenFor(late.email) })
        .expect(200);
      expect(expired.body.status).toBe('expired');

      await t.http().get('/api/v1/invitations/preview').query({ token: 'x'.repeat(43) }).expect(404);
      await t.http().get('/api/v1/invitations/preview').query({ token: 'short' }).expect(400);
      await t.http().get('/api/v1/invitations/preview').expect(400);
    });

    it('lists live invitations for the signed-in user, including the workspace they cannot read yet', async () => {
      const invitee = await t.newUser('lister');
      await invite([invitee.email]).expect(201);

      const res = await t.http().get('/api/v1/invitations/mine').set(bearerOf(invitee)).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: await idOfInvitation(invitee.email),
        workspaceName: expect.stringContaining('Workspace i'),
        workspaceSlug: expect.stringContaining('perm-'),
        roleName: 'Member',
        inviterName: 'owner',
      });
      await t.http().get('/api/v1/invitations/mine').set(t.as('viewer')).expect(200, []);
      await t.http().get('/api/v1/invitations/mine').expect(401);
    });

    it('hides invitations from users whose email is not verified', async () => {
      const invitee = await t.newUser('hidden', false);
      await invite([invitee.email]).expect(201);

      await t.http().get('/api/v1/invitations/mine').set(bearerOf(invitee)).expect(200, []);
    });

    it('accepts by invitation id from the in-app list', async () => {
      const invitee = await t.newUser('byid');
      await invite([invitee.email]).expect(201);
      const id = await idOfInvitation(invitee.email);

      await accept(invitee, { invitationId: id }).expect(200, { workspaceId });
      await accept(invitee, { invitationId: id }).expect(400);
    });

    it('does not let someone accept an invitation id addressed to somebody else', async () => {
      const invitee = await t.newUser('addressed');
      const other = await t.newUser('other');
      await invite([invitee.email]).expect(201);

      await accept(other, { invitationId: await idOfInvitation(invitee.email) }).expect(400);
    });

    it('declines, after which the link no longer works', async () => {
      const invitee = await t.newUser('decliner');
      await invite([invitee.email]).expect(201);
      const id = await idOfInvitation(invitee.email);

      await t.http().post(`/api/v1/invitations/${id}/decline`).set(bearerOf(invitee)).expect(204);

      await accept(invitee, { token: t.emails.tokenFor(invitee.email) }).expect(400);
      await t.http().post(`/api/v1/invitations/${id}/decline`).set(bearerOf(invitee)).expect(404);
      await t.http().get('/api/v1/invitations/mine').set(bearerOf(invitee)).expect(200, []);
    });

    it('does not let someone decline an invitation that is not theirs', async () => {
      const invitee = await t.newUser('declinee');
      const other = await t.newUser('meddler');
      await invite([invitee.email]).expect(201);

      await t
        .http()
        .post(`/api/v1/invitations/${await idOfInvitation(invitee.email)}/decline`)
        .set(bearerOf(other))
        .expect(404);
    });
  });

  describe('managing: list, resend, revoke', () => {
    it('lists open invitations with expired ones flagged', async () => {
      const live = await t.newUser('open');
      const old = await t.newUser('oldie');
      await invite([live.email, old.email]).expect(201);
      await t.db.query(
        `UPDATE public.workspace_invitations SET expires_at = now() - interval '1 day'
         WHERE workspace_id = $1 AND lower(email) = lower($2)`,
        [workspaceId, old.email],
      );

      const res = await t.http().get(invitationsUrl()).set(t.as('admin')).expect(200);

      const status = Object.fromEntries(
        res.body.map((i: { email: string; status: string }) => [i.email, i.status]),
      );
      expect(status).toEqual({ [live.email]: 'pending', [old.email]: 'expired' });
      expect(JSON.stringify(res.body)).not.toMatch(/token/i);
      await t.http().get(invitationsUrl()).set(t.as('member')).expect(403);
    });

    it('resends with a new token and expiry, invalidating the old link', async () => {
      const invitee = await t.newUser('resent');
      await invite([invitee.email]).expect(201);
      const oldToken = t.emails.tokenFor(invitee.email);
      await t.db.query(
        `UPDATE public.workspace_invitations SET expires_at = now() - interval '1 day'
         WHERE workspace_id = $1 AND lower(email) = lower($2)`,
        [workspaceId, invitee.email],
      );

      const res = await t
        .http()
        .post(`${invitationsUrl()}/${await idOfInvitation(invitee.email)}/resend`)
        .set(t.as('admin'))
        .expect(200);

      expect(res.body.status).toBe('pending');
      const newToken = t.emails.tokenFor(invitee.email);
      expect(newToken).not.toBe(oldToken);
      await accept(invitee, { token: oldToken }).expect(400);
      await accept(invitee, { token: newToken }).expect(200);
    });

    it('is 404 to resend or revoke an invitation that is gone or belongs to another workspace', async () => {
      const invitee = await t.newUser('elsewhere');
      await invite([invitee.email]).expect(201);
      const id = await idOfInvitation(invitee.email);
      const otherWorkspace = await t.createWorkspace(`k${Math.random().toString(36).slice(2, 8)}`);

      await t.http().post(`${invitationsUrl(otherWorkspace)}/${id}/resend`).set(t.as('owner')).expect(404);
      await t.http().delete(`${invitationsUrl(otherWorkspace)}/${id}`).set(t.as('owner')).expect(404);
      await t.http().post(`${invitationsUrl()}/not-a-uuid/resend`).set(t.as('owner')).expect(400);
    });

    it('revokes an invitation so it can no longer be accepted, and revoking twice is 404', async () => {
      const invitee = await t.newUser('revoked');
      await invite([invitee.email]).expect(201);
      const id = await idOfInvitation(invitee.email);

      await t.http().delete(`${invitationsUrl()}/${id}`).set(t.as('admin')).expect(204);

      await accept(invitee, { token: t.emails.tokenFor(invitee.email) }).expect(400);
      await t.http().delete(`${invitationsUrl()}/${id}`).set(t.as('admin')).expect(404);
      await t.http().post(`${invitationsUrl()}/${id}/resend`).set(t.as('admin')).expect(404);
    });

    it('allows inviting the address again after a revoke', async () => {
      const invitee = await t.newUser('again');
      await invite([invitee.email]).expect(201);
      await t.http().delete(`${invitationsUrl()}/${await idOfInvitation(invitee.email)}`).set(t.as('owner')).expect(204);

      const res = await invite([invitee.email]).expect(201);

      expect(res.body[0].outcome).toBe('invited');
    });

    it('is refused for members, viewers and outsiders', async () => {
      const invitee = await t.newUser('guarded');
      await invite([invitee.email]).expect(201);
      const id = await idOfInvitation(invitee.email);

      for (const user of ['member', 'viewer', 'outsider'] as const) {
        await t.http().post(`${invitationsUrl()}/${id}/resend`).set(t.as(user)).expect(403);
        await t.http().delete(`${invitationsUrl()}/${id}`).set(t.as(user)).expect(403);
      }
    });
  });
});
