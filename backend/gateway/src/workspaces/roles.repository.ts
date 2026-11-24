import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { TenantTransaction } from '../database/database.types';
import {
  permissions,
  rolePermissions,
  workspaceInvitations,
  workspaceMembers,
  workspaceRoles,
} from '../database/schemas';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../database/schemas/workspace/permission-keys';
import type { PermissionInfo, RoleSummary } from './types';

export interface RoleContext {
  userId: string;
  workspaceId: string;
}

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSION_KEYS);

const onlyKnown = (keys: string[]): PermissionKey[] =>
  keys.filter((key): key is PermissionKey => KNOWN_PERMISSIONS.has(key));

/** System roles (`workspace_id IS NULL`) plus the roles of this workspace. */
const usableInWorkspace = (workspaceId: string) =>
  or(isNull(workspaceRoles.workspaceId), eq(workspaceRoles.workspaceId, workspaceId));

async function withPermissions(
  tx: TenantTransaction,
  roles: Array<{ id: string; key: string; name: string; isSystem: boolean }>,
): Promise<RoleSummary[]> {
  if (roles.length === 0) return [];
  const grants = await tx
    .select({ roleId: rolePermissions.roleId, key: rolePermissions.permissionKey })
    .from(rolePermissions)
    .where(
      inArray(
        rolePermissions.roleId,
        roles.map((role) => role.id),
      ),
    );

  const byRole = new Map<string, string[]>();
  for (const grant of grants) {
    byRole.set(grant.roleId, [...(byRole.get(grant.roleId) ?? []), grant.key]);
  }
  return roles.map((role) => ({
    ...role,
    permissions: onlyKnown(byRole.get(role.id) ?? []),
  }));
}

/**
 * Role reads and writes run in `withTenant`, so the role policies apply: anyone in the workspace
 * can read system and workspace roles; creating, changing or deleting a custom role needs
 * `member:update_role`, and system roles are never writable.
 */
@Injectable()
export class RolesRepository {
  constructor(private readonly database: DatabaseService) {}

  list(ctx: RoleContext): Promise<RoleSummary[]> {
    return this.database.withTenant(ctx, async (tx) => {
      const roles = await tx
        .select({
          id: workspaceRoles.id,
          key: workspaceRoles.key,
          name: workspaceRoles.name,
          isSystem: workspaceRoles.isSystem,
        })
        .from(workspaceRoles)
        .where(usableInWorkspace(ctx.workspaceId))
        .orderBy(sql`${workspaceRoles.isSystem} DESC`, asc(workspaceRoles.name));
      return withPermissions(tx, roles);
    });
  }

  find(ctx: RoleContext, roleId: string): Promise<RoleSummary | null> {
    return this.database.withTenant(ctx, async (tx) => this.findInTransaction(tx, ctx, roleId));
  }

  /** A taken key raises a unique violation. A caller without `member:update_role` raises 42501. */
  create(
    ctx: RoleContext,
    input: { key: string; name: string; permissions: PermissionKey[] },
  ): Promise<RoleSummary> {
    return this.database.withTenant(ctx, async (tx) => {
      // No RETURNING here: it would check the new row against the SELECT policy
      // `app.can_read_role(id)`, a STABLE function that reads the table through the statement's
      // starting snapshot and so cannot see the row being inserted. Read it back afterwards.
      await tx.insert(workspaceRoles).values({
        workspaceId: ctx.workspaceId,
        key: input.key,
        name: input.name,
        isSystem: false,
      });
      const [role] = await tx
        .select({
          id: workspaceRoles.id,
          key: workspaceRoles.key,
          name: workspaceRoles.name,
          isSystem: workspaceRoles.isSystem,
        })
        .from(workspaceRoles)
        .where(
          and(eq(workspaceRoles.workspaceId, ctx.workspaceId), eq(workspaceRoles.key, input.key)),
        );
      if (input.permissions.length > 0) {
        await tx
          .insert(rolePermissions)
          .values(input.permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })));
      }
      return { ...role, permissions: input.permissions };
    });
  }

  /** `null` when the role is not a writable custom role of this workspace. */
  update(
    ctx: RoleContext,
    roleId: string,
    patch: { name?: string; permissions?: PermissionKey[] },
  ): Promise<RoleSummary | null> {
    return this.database.withTenant(ctx, async (tx) => {
      const current = await this.findInTransaction(tx, ctx, roleId);
      if (!current || current.isSystem) return null;

      const updated = await tx
        .update(workspaceRoles)
        .set({ name: patch.name ?? current.name })
        .where(and(eq(workspaceRoles.id, roleId), eq(workspaceRoles.workspaceId, ctx.workspaceId)))
        .returning({ id: workspaceRoles.id });
      if (updated.length === 0) return null;

      if (patch.permissions) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
        if (patch.permissions.length > 0) {
          await tx
            .insert(rolePermissions)
            .values(patch.permissions.map((permissionKey) => ({ roleId, permissionKey })));
        }
      }
      return this.findInTransaction(tx, ctx, roleId);
    });
  }

  /**
   * The foreign keys from members and invitations are RESTRICT, so a role in use is detected up
   * front and reported instead of surfacing a raw constraint error.
   */
  remove(ctx: RoleContext, roleId: string): Promise<'deleted' | 'in-use' | 'missing'> {
    return this.database.withTenant(ctx, async (tx) => {
      const [members] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.roleId, roleId));
      const [invitations] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(workspaceInvitations)
        .where(eq(workspaceInvitations.roleId, roleId));
      if ((members?.total ?? 0) + (invitations?.total ?? 0) > 0) return 'in-use';

      const deleted = await tx
        .delete(workspaceRoles)
        .where(and(eq(workspaceRoles.id, roleId), eq(workspaceRoles.workspaceId, ctx.workspaceId)))
        .returning({ id: workspaceRoles.id });
      return deleted.length > 0 ? 'deleted' : 'missing';
    });
  }

  async listPermissions(ctx: RoleContext): Promise<PermissionInfo[]> {
    const rows = await this.database.withTenant(ctx, (tx) =>
      tx
        .select({ key: permissions.key, description: permissions.description })
        .from(permissions)
        .orderBy(asc(permissions.key)),
    );
    return rows.flatMap((row) =>
      KNOWN_PERMISSIONS.has(row.key)
        ? [{ key: row.key as PermissionKey, description: row.description }]
        : [],
    );
  }

  private async findInTransaction(
    tx: TenantTransaction,
    ctx: RoleContext,
    roleId: string,
  ): Promise<RoleSummary | null> {
    const roles = await tx
      .select({
        id: workspaceRoles.id,
        key: workspaceRoles.key,
        name: workspaceRoles.name,
        isSystem: workspaceRoles.isSystem,
      })
      .from(workspaceRoles)
      .where(and(eq(workspaceRoles.id, roleId), usableInWorkspace(ctx.workspaceId)));
    const [role] = await withPermissions(tx, roles);
    return role ?? null;
  }
}
