import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client, Pool } from 'pg';

/**
 * Integration tests for the SECURITY DEFINER functions behind workspace slugs and invitation
 * preview / accept / decline. They connect as the non-owner `app_user` (RLS enforced).
 */
describe('Workspace SQL functions', () => {
  const runId = randomUUID().slice(0, 8);
  const email = (name: string) => `wsfn-${runId}-${name}@test.local`;
  const day = 24 * 60 * 60 * 1000;

  let app: Pool;
  let owner: Client;
  let memberRoleId: string;
  let ownerRoleId: string;

  const createUser = async (name: string, verified = true): Promise<string> => {
    const { rows } = await app.query<{ id: string }>(
      `SELECT app.auth_create_user($1, $2, 'hash', $3) AS id`,
      [email(name), name, verified],
    );
    return rows[0].id;
  };

  /** Runs `fn` in a committed transaction with `app.user_id` set, the way `withTenant` does. */
  const asUser = async <T>(userId: string | null, fn: (c: Client) => Promise<T>): Promise<T> => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      if (userId) await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  };

  const createWorkspace = (userId: string, slug: string): Promise<string> =>
    asUser(userId, async (c) => {
      const { rows } = await c.query<{ id: string }>(`SELECT app.create_workspace($1, $2) AS id`, [
        'Fn workspace',
        `wsfn-${slug}-${runId}`,
      ]);
      return rows[0].id;
    });

  const insertInvitation = async (
    workspaceId: string,
    invitedBy: string,
    to: string,
    tokenHash: string,
    overrides: { roleId?: string; expiresAt?: Date; revokedAt?: Date | null } = {},
  ): Promise<string> => {
    const { rows } = await owner.query<{ id: string }>(
      `INSERT INTO public.workspace_invitations
         (workspace_id, email, role_id, token_hash, invited_by, expires_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        workspaceId,
        to,
        overrides.roleId ?? memberRoleId,
        tokenHash,
        invitedBy,
        overrides.expiresAt ?? new Date(Date.now() + day),
        overrides.revokedAt ?? null,
      ],
    );
    return rows[0].id;
  };

  const accept = (userId: string, tokenHash: string | null, invitationId: string | null) =>
    asUser(userId, (c) =>
      c.query<{ id: string | null }>(`SELECT app.accept_workspace_invitation($1, $2) AS id`, [
        tokenHash,
        invitationId,
      ]),
    );

  const isMember = async (workspaceId: string, userId: string): Promise<boolean> => {
    const { rowCount } = await owner.query(
      `SELECT 1 FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );
    return rowCount === 1;
  };

  beforeAll(async () => {
    app = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
    owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();
    const { rows } = await owner.query<{ id: string; key: string }>(
      `SELECT id, key FROM public.workspace_roles WHERE workspace_id IS NULL`,
    );
    memberRoleId = rows.find((r) => r.key === 'member')!.id;
    ownerRoleId = rows.find((r) => r.key === 'owner')!.id;
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.workspaces WHERE slug LIKE $1`, [`wsfn-%-${runId}`]);
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [`wsfn-${runId}-%`]);
    await owner.end();
    await app.end();
  });

  describe('app.workspace_slug_available', () => {
    it('is false for a slug in use, even for a user who is not a member', async () => {
      const creator = await createUser('slug-creator');
      const stranger = await createUser('slug-stranger');
      await createWorkspace(creator, 'taken');

      const { rows } = await asUser(stranger, (c) =>
        c.query<{ ok: boolean }>(`SELECT app.workspace_slug_available($1) AS ok`, [
          `wsfn-taken-${runId}`,
        ]),
      );

      expect(rows[0].ok).toBe(false);
    });

    it('is true for a free slug and ignores case', async () => {
      const user = await createUser('slug-free');
      const { rows } = await asUser(user, (c) =>
        c.query<{ free: boolean; upper: boolean }>(
          `SELECT app.workspace_slug_available($1) AS free,
                  app.workspace_slug_available($2) AS upper`,
          [`wsfn-free-${runId}`, `WSFN-TAKEN-${runId}`],
        ),
      );
      expect(rows[0].free).toBe(true);
      expect(rows[0].upper).toBe(false);
    });
  });

  describe('app.preview_workspace_invitation', () => {
    it('describes a pending invitation without any user context and without leaking ids', async () => {
      const inviter = await createUser('prev-inviter');
      const workspaceId = await createWorkspace(inviter, 'preview');
      await insertInvitation(workspaceId, inviter, email('prev-invitee'), `${runId}-prev`);

      const { rows } = await asUser(null, (c) =>
        c.query(`SELECT * FROM app.preview_workspace_invitation($1)`, [`${runId}-prev`]),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        workspace_name: 'Fn workspace',
        role_name: expect.any(String),
        inviter_name: 'prev-inviter',
        status: 'pending',
      });
      expect(Object.keys(rows[0])).not.toContain('workspace_id');
    });

    it('reports expired and revoked invitations and returns nothing for an unknown token', async () => {
      const inviter = await createUser('prev2-inviter');
      const workspaceId = await createWorkspace(inviter, 'preview2');
      await insertInvitation(workspaceId, inviter, email('prev2-a'), `${runId}-exp`, {
        expiresAt: new Date(Date.now() - day),
      });
      await insertInvitation(workspaceId, inviter, email('prev2-b'), `${runId}-rev`, {
        revokedAt: new Date(),
      });

      const status = async (hash: string) => {
        const { rows } = await asUser(null, (c) =>
          c.query<{ status: string }>(`SELECT * FROM app.preview_workspace_invitation($1)`, [hash]),
        );
        return rows[0]?.status;
      };

      expect(await status(`${runId}-exp`)).toBe('expired');
      expect(await status(`${runId}-rev`)).toBe('revoked');
      expect(await status(`${runId}-nope`)).toBeUndefined();
    });
  });

  describe('app.accept_workspace_invitation', () => {
    it('adds the verified invitee with the invited role, once, by token or by id', async () => {
      const inviter = await createUser('acc-inviter');
      const invitee = await createUser('acc-invitee');
      const workspaceId = await createWorkspace(inviter, 'accept');
      await insertInvitation(workspaceId, inviter, email('acc-invitee'), `${runId}-acc`);

      const result = await accept(invitee, `${runId}-acc`, null);

      expect(result.rows[0].id).toBe(workspaceId);
      expect(await isMember(workspaceId, invitee)).toBe(true);
      const { rows } = await owner.query<{ key: string; accepted: boolean }>(
        `SELECT r.key, i.accepted_at IS NOT NULL AS accepted
         FROM public.workspace_members m
         JOIN public.workspace_roles r ON r.id = m.role_id
         JOIN public.workspace_invitations i ON i.workspace_id = m.workspace_id AND i.token_hash = $3
         WHERE m.workspace_id = $1 AND m.user_id = $2`,
        [workspaceId, invitee, `${runId}-acc`],
      );
      expect(rows[0]).toEqual({ key: 'member', accepted: true });

      await expect(accept(invitee, `${runId}-acc`, null)).rejects.toThrow();
    });

    it('accepts by invitation id for the in-app flow', async () => {
      const inviter = await createUser('byid-inviter');
      const invitee = await createUser('byid-invitee');
      const workspaceId = await createWorkspace(inviter, 'byid');
      const id = await insertInvitation(workspaceId, inviter, email('byid-invitee'), `${runId}-byid`);

      const result = await accept(invitee, null, id);

      expect(result.rows[0].id).toBe(workspaceId);
      expect(await isMember(workspaceId, invitee)).toBe(true);
    });

    it('matches the email case-insensitively', async () => {
      const inviter = await createUser('case-inviter');
      const invitee = await createUser('case-invitee');
      const workspaceId = await createWorkspace(inviter, 'case');
      await insertInvitation(
        workspaceId,
        inviter,
        email('case-invitee').toUpperCase(),
        `${runId}-case`,
      );

      await accept(invitee, `${runId}-case`, null);

      expect(await isMember(workspaceId, invitee)).toBe(true);
    });

    it('rejects a user whose email is not the invited one', async () => {
      const inviter = await createUser('wrong-inviter');
      const invitee = await createUser('wrong-invitee');
      const other = await createUser('wrong-other');
      const workspaceId = await createWorkspace(inviter, 'wrong');
      await insertInvitation(workspaceId, inviter, email('wrong-invitee'), `${runId}-wrong`);

      await expect(accept(other, `${runId}-wrong`, null)).rejects.toThrow();

      expect(await isMember(workspaceId, other)).toBe(false);
      expect(await isMember(workspaceId, invitee)).toBe(false);
    });

    it('rejects an invitee whose email is not verified', async () => {
      const inviter = await createUser('unv-inviter');
      const invitee = await createUser('unv-invitee', false);
      const workspaceId = await createWorkspace(inviter, 'unverified');
      await insertInvitation(workspaceId, inviter, email('unv-invitee'), `${runId}-unv`);

      await expect(accept(invitee, `${runId}-unv`, null)).rejects.toThrow();

      expect(await isMember(workspaceId, invitee)).toBe(false);
    });

    it('rejects expired, revoked and unknown invitations', async () => {
      const inviter = await createUser('bad-inviter');
      const invitee = await createUser('bad-invitee');
      const workspaceId = await createWorkspace(inviter, 'bad');
      await insertInvitation(workspaceId, inviter, email('bad-invitee'), `${runId}-bad-exp`, {
        expiresAt: new Date(Date.now() - day),
      });
      await expect(accept(invitee, `${runId}-bad-exp`, null)).rejects.toThrow();

      await owner.query(`DELETE FROM public.workspace_invitations WHERE workspace_id = $1`, [
        workspaceId,
      ]);
      await insertInvitation(workspaceId, inviter, email('bad-invitee'), `${runId}-bad-rev`, {
        revokedAt: new Date(),
      });
      await expect(accept(invitee, `${runId}-bad-rev`, null)).rejects.toThrow();
      await expect(accept(invitee, `${runId}-unknown`, null)).rejects.toThrow();

      expect(await isMember(workspaceId, invitee)).toBe(false);
    });

    it('requires exactly one of token hash and invitation id', async () => {
      const user = await createUser('arg-user');
      await expect(accept(user, null, null)).rejects.toThrow();
      await expect(accept(user, 'x', randomUUID())).rejects.toThrow();
    });

    it('requires an authenticated user context', async () => {
      await expect(
        asUser(null, (c) =>
          c.query(`SELECT app.accept_workspace_invitation($1, NULL)`, ['anything']),
        ),
      ).rejects.toThrow();
    });

    it('never grants the owner role, even if an invitation carries it', async () => {
      const inviter = await createUser('own-inviter');
      const invitee = await createUser('own-invitee');
      const workspaceId = await createWorkspace(inviter, 'ownerrole');
      await insertInvitation(workspaceId, inviter, email('own-invitee'), `${runId}-own`, {
        roleId: ownerRoleId,
      });

      await expect(accept(invitee, `${runId}-own`, null)).rejects.toThrow();

      expect(await isMember(workspaceId, invitee)).toBe(false);
    });

    it('lets only one of two concurrent accepts succeed', async () => {
      const inviter = await createUser('race-inviter');
      const invitee = await createUser('race-invitee');
      const workspaceId = await createWorkspace(inviter, 'race');
      await insertInvitation(workspaceId, inviter, email('race-invitee'), `${runId}-race`);

      const results = await Promise.allSettled([
        accept(invitee, `${runId}-race`, null),
        accept(invitee, `${runId}-race`, null),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    });
  });

  describe('app.decline_workspace_invitation', () => {
    it('lets the verified invitee decline, which revokes the invitation', async () => {
      const inviter = await createUser('dec-inviter');
      const invitee = await createUser('dec-invitee');
      const workspaceId = await createWorkspace(inviter, 'decline');
      const id = await insertInvitation(workspaceId, inviter, email('dec-invitee'), `${runId}-dec`);

      const { rows } = await asUser(invitee, (c) =>
        c.query<{ ok: boolean }>(`SELECT app.decline_workspace_invitation($1) AS ok`, [id]),
      );

      expect(rows[0].ok).toBe(true);
      await expect(accept(invitee, `${runId}-dec`, null)).rejects.toThrow();
    });

    it('returns false when the invitation belongs to someone else', async () => {
      const inviter = await createUser('dec2-inviter');
      await createUser('dec2-invitee');
      const other = await createUser('dec2-other');
      const workspaceId = await createWorkspace(inviter, 'decline2');
      const id = await insertInvitation(workspaceId, inviter, email('dec2-invitee'), `${runId}-dec2`);

      const { rows } = await asUser(other, (c) =>
        c.query<{ ok: boolean }>(`SELECT app.decline_workspace_invitation($1) AS ok`, [id]),
      );

      expect(rows[0].ok).toBe(false);
    });
  });

  describe('app.list_my_workspace_invitations', () => {
    it('lists only live invitations for the caller, including the workspace the caller cannot read', async () => {
      const inviter = await createUser('list-inviter');
      const invitee = await createUser('list-invitee');
      const workspaceId = await createWorkspace(inviter, 'list');
      await insertInvitation(workspaceId, inviter, email('list-invitee'), `${runId}-l-live`);
      await insertInvitation(workspaceId, inviter, email('list-other'), `${runId}-l-other`);
      await insertInvitation(workspaceId, inviter, email('list-invitee'), `${runId}-l-old`, {
        revokedAt: new Date(),
      });

      const { rows } = await asUser(invitee, (c) =>
        c.query(`SELECT * FROM app.list_my_workspace_invitations()`),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        workspace_name: 'Fn workspace',
        workspace_slug: `wsfn-list-${runId}`,
        inviter_name: 'list-inviter',
      });
    });

    it('returns nothing while the caller email is unverified', async () => {
      const inviter = await createUser('list2-inviter');
      const invitee = await createUser('list2-invitee', false);
      const workspaceId = await createWorkspace(inviter, 'list2');
      await insertInvitation(workspaceId, inviter, email('list2-invitee'), `${runId}-l2`);

      const { rows } = await asUser(invitee, (c) =>
        c.query(`SELECT * FROM app.list_my_workspace_invitations()`),
      );

      expect(rows).toHaveLength(0);
    });
  });

  describe('app.purge_workspace_invitations', () => {
    it('removes long-finished invitations and keeps pending and recent ones', async () => {
      const inviter = await createUser('purge-inviter');
      const workspaceId = await createWorkspace(inviter, 'purge');
      await insertInvitation(workspaceId, inviter, email('purge-old'), `${runId}-p-old`, {
        expiresAt: new Date(Date.now() - 40 * day),
      });
      await insertInvitation(workspaceId, inviter, email('purge-rev'), `${runId}-p-rev`, {
        revokedAt: new Date(Date.now() - 40 * day),
      });
      await insertInvitation(workspaceId, inviter, email('purge-new'), `${runId}-p-new`, {
        expiresAt: new Date(Date.now() - 1 * day),
      });
      await insertInvitation(workspaceId, inviter, email('purge-live'), `${runId}-p-live`);

      await app.query(`SELECT app.purge_workspace_invitations()`);

      const { rows } = await owner.query<{ token_hash: string }>(
        `SELECT token_hash FROM public.workspace_invitations WHERE workspace_id = $1`,
        [workspaceId],
      );
      expect(rows.map((r) => r.token_hash).sort()).toEqual(
        [`${runId}-p-live`, `${runId}-p-new`].sort(),
      );
    });
  });
});
