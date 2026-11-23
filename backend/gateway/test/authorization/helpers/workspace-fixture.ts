import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client, Pool } from 'pg';

export type FixtureUser = 'owner' | 'admin' | 'member' | 'viewer' | 'outsider';

/**
 * One workspace with an owner plus an admin, a member and a viewer (system roles), and an
 * outsider who owns a different workspace. Connects as the non-owner `app_user` (RLS enforced);
 * the owner connection is only used for setup that RLS would otherwise block and for cleanup.
 */
export class WorkspaceFixture {
  readonly runId = randomUUID().slice(0, 8);
  readonly ids = {} as Record<FixtureUser, string>;
  readonly emails = {} as Record<FixtureUser, string>;
  workspaceId!: string;
  otherWorkspaceId!: string;

  private app!: Pool;
  private owner!: Client;
  private readonly roleIds = {} as Record<'admin' | 'member' | 'viewer', string>;

  async setUp(): Promise<void> {
    this.app = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    this.owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await this.owner.connect();

    for (const name of ['owner', 'admin', 'member', 'viewer', 'outsider'] as const) {
      this.emails[name] = `perm-${this.runId}-${name}@test.local`;
      const { rows } = await this.app.query<{ id: string }>(
        `SELECT app.auth_create_user($1, $2, 'hash', true) AS id`,
        [this.emails[name], name],
      );
      this.ids[name] = rows[0].id;
    }

    const roles = await this.asUser(this.ids.owner, (c) =>
      c.query<{ id: string; key: string }>(
        `SELECT id, key FROM public.workspace_roles WHERE workspace_id IS NULL`,
      ),
    );
    for (const key of ['admin', 'member', 'viewer'] as const) {
      this.roleIds[key] = roles.rows.find((r) => r.key === key)!.id;
    }

    this.workspaceId = await this.commitAs(this.ids.owner, async (c) => {
      const { rows } = await c.query<{ id: string }>(`SELECT app.create_workspace($1, $2) AS id`, [
        'Permission fixture',
        `perm-${this.runId}`,
      ]);
      for (const name of ['admin', 'member', 'viewer'] as const) {
        await c.query(
          `INSERT INTO public.workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, $3)`,
          [rows[0].id, this.ids[name], this.roleIds[name]],
        );
      }
      return rows[0].id;
    });

    this.otherWorkspaceId = await this.commitAs(this.ids.outsider, async (c) => {
      const { rows } = await c.query<{ id: string }>(`SELECT app.create_workspace($1, $2) AS id`, [
        'Someone else',
        `perm-other-${this.runId}`,
      ]);
      return rows[0].id;
    });
  }

  async tearDown(): Promise<void> {
    await this.owner.query(`DELETE FROM public.workspaces WHERE slug LIKE $1`, [
      `perm-%${this.runId}`,
    ]);
    await this.owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [
      `perm-${this.runId}-%`,
    ]);
    await this.owner.end();
    await this.app.end();
  }

  /** Adds a per-member allow/deny override (setup only, so it bypasses RLS as the owner role). */
  async setOverride(user: FixtureUser, permission: string, effect: 'allow' | 'deny'): Promise<void> {
    await this.owner.query(
      `INSERT INTO public.member_permission_overrides (workspace_id, user_id, permission_key, effect)
       VALUES ($1, $2, $3, $4)`,
      [this.workspaceId, this.ids[user], permission, effect],
    );
  }

  async clearOverrides(): Promise<void> {
    await this.owner.query(`DELETE FROM public.member_permission_overrides WHERE workspace_id = $1`, [
      this.workspaceId,
    ]);
  }

  private async asUser<T>(userId: string, fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
      const result = await fn(client);
      await client.query('ROLLBACK');
      return result;
    } finally {
      await client.end();
    }
  }

  private async commitAs<T>(userId: string, fn: (client: Client) => Promise<T>): Promise<T> {
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
}
