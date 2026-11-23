import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { PermissionKey } from '../database/schemas/workspace/permission-keys';

/** Answers "may this user do X in this workspace?" using the database's own rules. */
@Injectable()
export class PermissionService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * True when the user holds every one of the permissions in the workspace. The owner holds
   * all of them; a non-member, an unknown workspace or an unknown code yields false.
   *
   * One statement and one round trip however many codes are checked: it delegates to
   * `app.has_permission`, so owner, role and per-member override rules live in one place.
   */
  async hasAll(
    userId: string,
    workspaceId: string,
    permissions: readonly PermissionKey[],
  ): Promise<boolean> {
    if (permissions.length === 0) return true;

    const keys = sql.join(
      permissions.map((permission) => sql`${permission}`),
      sql`, `,
    );

    const rows = await this.database.withTenant({ userId, workspaceId }, async (tx) => {
      const result = await tx.execute<{ allowed: boolean | null }>(
        sql`SELECT bool_and(app.has_permission(${workspaceId}::uuid, k)) AS allowed
            FROM unnest(ARRAY[${keys}]::text[]) AS k`,
      );
      return result.rows;
    });

    return rows[0]?.allowed === true;
  }
}
