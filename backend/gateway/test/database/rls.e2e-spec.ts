import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client, Pool } from 'pg';

/**
 * Integration test for tenancy + permissions. Requires a migrated database
 * (`npm run db:migrate`) and connects as the non-owner `app_user` role.
 */
describe('Row level security (tenancy and permissions)', () => {
  const runId = randomUUID().slice(0, 8);
  const email = (name: string) => `rls-${runId}-${name}@test.local`;

  let app: Pool;
  let owner: Client;

  const ids = {} as Record<
    'owner' | 'admin' | 'member' | 'viewer' | 'outsider',
    string
  >;
  const roleIds = {} as Record<'admin' | 'member' | 'viewer', string>;
  let workspaceId: string;
  let otherWorkspaceId: string;

  async function asUser<T>(
    userId: string | null,
    fn: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [
        userId ?? '',
      ]);
      const result = await fn(client);
      await client.query('ROLLBACK');
      return result;
    } finally {
      await client.end();
    }
  }

  async function committedAs<T>(
    userId: string,
    fn: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }

  async function createUser(name: keyof typeof ids): Promise<void> {
    const { rows } = await app.query<{ id: string }>(
      `SELECT app.auth_create_user($1, $2, $3, true) AS id`,
      [email(name), name, name === 'outsider' ? null : 'hash'],
    );
    ids[name] = rows[0].id;
  }

  beforeAll(async () => {
    app = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    owner = new Client({
      connectionString:
        process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();

    for (const name of ['owner', 'admin', 'member', 'viewer', 'outsider'] as const) {
      await createUser(name);
    }

    // Roles are only readable with an authenticated user context.
    const roles = await asUser(ids.owner, (c) =>
      c.query<{ id: string; key: string }>(
        `SELECT id, key FROM public.workspace_roles WHERE workspace_id IS NULL`,
      ),
    );
    for (const key of ['admin', 'member', 'viewer'] as const) {
      roleIds[key] = roles.rows.find((r) => r.key === key)!.id;
    }

    workspaceId = await committedAs(ids.owner, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT app.create_workspace($1, $2) AS id`,
        ['RLS Test', `rls-${runId}`],
      );
      for (const [name, role] of [
        ['admin', roleIds.admin],
        ['member', roleIds.member],
        ['viewer', roleIds.viewer],
      ] as const) {
        await c.query(
          `INSERT INTO public.workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, $3)`,
          [rows[0].id, ids[name], role],
        );
      }
      return rows[0].id;
    });

    otherWorkspaceId = await committedAs(ids.outsider, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        `SELECT app.create_workspace($1, $2) AS id`,
        ['Other', `rls-other-${runId}`],
      );
      return rows[0].id;
    });
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.workspaces WHERE slug LIKE $1`, [
      `rls-%${runId}`,
    ]);
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [
      `rls-${runId}-%`,
    ]);
    await owner.end();
    await app.end();
  });

  it('denies every tenant table when no user context is set', async () => {
    await asUser(null, async (c) => {
      for (const table of ['users', 'workspaces', 'workspace_members', 'sessions']) {
        const { rows } = await c.query(`SELECT 1 FROM public.${table}`);
        expect(rows).toHaveLength(0);
      }
    });
  });

  it('isolates workspaces: an outsider sees none of another workspace', async () => {
    await asUser(ids.outsider, async (c) => {
      const ws = await c.query(`SELECT id FROM public.workspaces`);
      expect(ws.rows.map((r) => r.id)).toEqual([otherWorkspaceId]);
      const members = await c.query(
        `SELECT 1 FROM public.workspace_members WHERE workspace_id = $1`,
        [workspaceId],
      );
      expect(members.rows).toHaveLength(0);
    });
  });

  it('lets members see their workspace and co-members', async () => {
    await asUser(ids.viewer, async (c) => {
      const members = await c.query(
        `SELECT user_id FROM public.workspace_members WHERE workspace_id = $1`,
        [workspaceId],
      );
      expect(members.rows).toHaveLength(4);
      const users = await c.query(`SELECT id FROM public.users`);
      expect(users.rows.map((r) => r.id)).not.toContain(ids.outsider);
    });
  });

  it('resolves permissions: owner > role > override', async () => {
    const check = (user: string, key: string) =>
      asUser(user, async (c) => {
        const { rows } = await c.query<{ ok: boolean }>(
          `SELECT app.has_permission($1, $2) AS ok`,
          [workspaceId, key],
        );
        return rows[0].ok;
      });

    expect(await check(ids.owner, 'workspace:delete')).toBe(true);
    expect(await check(ids.admin, 'workspace:delete')).toBe(false);
    expect(await check(ids.admin, 'member:invite')).toBe(true);
    expect(await check(ids.member, 'task:update')).toBe(true);
    expect(await check(ids.viewer, 'task:update')).toBe(false);
    expect(await check(ids.outsider, 'task:read')).toBe(false);

    // deny override beats the role; allow override adds to the role.
    await committedAs(ids.admin, async (c) => {
      await c.query(
        `INSERT INTO public.member_permission_overrides (workspace_id, user_id, permission_key, effect)
         VALUES ($1, $2, 'task:update', 'deny'), ($1, $3, 'task:update', 'allow')`,
        [workspaceId, ids.member, ids.viewer],
      );
    });
    expect(await check(ids.member, 'task:update')).toBe(false);
    expect(await check(ids.viewer, 'task:update')).toBe(true);
  });

  it('only lets permitted members add members', async () => {
    await asUser(ids.member, async (c) => {
      await expect(
        c.query(
          `INSERT INTO public.workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, $3)`,
          [workspaceId, ids.outsider, roleIds.viewer],
        ),
      ).rejects.toThrow(/row-level security/);
    });
    await asUser(ids.admin, async (c) => {
      const res = await c.query(
        `INSERT INTO public.workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, $3)`,
        [workspaceId, ids.outsider, roleIds.viewer],
      );
      expect(res.rowCount).toBe(1);
    });
  });

  it('prevents anyone from demoting or removing the owner', async () => {
    await asUser(ids.admin, async (c) => {
      const upd = await c.query(
        `UPDATE public.workspace_members SET role_id = $3 WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, ids.owner, roleIds.viewer],
      );
      expect(upd.rowCount).toBe(0);
      const del = await c.query(
        `DELETE FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, ids.owner],
      );
      expect(del.rowCount).toBe(0);
    });
    await asUser(ids.owner, async (c) => {
      const del = await c.query(
        `DELETE FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, ids.owner],
      );
      expect(del.rowCount).toBe(0);
    });
  });

  it('rejects direct workspace inserts and forged workspace ids', async () => {
    await asUser(ids.outsider, async (c) => {
      await expect(
        c.query(
          `INSERT INTO public.workspaces (name, slug, owner_id) VALUES ('x', $1, $2)`,
          [`rls-forged-${runId}`, ids.outsider],
        ),
      ).rejects.toThrow(/row-level security/);
    });
    await asUser(ids.outsider, async (c) => {
      await expect(
        c.query(
          `INSERT INTO public.member_permission_overrides (workspace_id, user_id, permission_key, effect)
           VALUES ($1, $2, 'task:read', 'allow')`,
          [workspaceId, ids.outsider],
        ),
      ).rejects.toThrow();
    });
  });

  it('keeps the permission catalog read-only for app_user', async () => {
    await asUser(ids.owner, async (c) => {
      await expect(
        c.query(`INSERT INTO public.permissions (key, description) VALUES ('x:y', 'x')`),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it('exposes only login fields through the pre-auth lookup', async () => {
    const { rows, fields } = await app.query(
      `SELECT * FROM app.auth_find_user_by_email($1)`,
      [email('member').toUpperCase()],
    );
    expect(rows).toHaveLength(1);
    expect(fields.map((f) => f.name).sort()).toEqual(
      ['email', 'email_verified_at', 'id', 'is_active', 'name', 'password_hash'].sort(),
    );
    const oauthOnly = await app.query(
      `SELECT password_hash FROM app.auth_find_user_by_email($1)`,
      [email('outsider')],
    );
    expect(oauthOnly.rows[0].password_hash).toBeNull();
  });
});
