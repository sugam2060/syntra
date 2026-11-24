import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { TenantTransaction } from '../database/database.types';
import {
  memberPermissionOverrides,
  users,
  workspaceMembers,
  workspaceRoles,
  workspaces,
} from '../database/schemas';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../database/schemas/workspace/permission-keys';
import type { MemberSummary, PermissionOverride } from './types';

export interface MemberContext {
  userId: string;
  workspaceId: string;
}

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSION_KEYS);

const selectMembers = (tx: TenantTransaction, workspaceId: string) =>
  tx
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      roleId: workspaceRoles.id,
      roleKey: workspaceRoles.key,
      roleName: workspaceRoles.name,
      ownerId: workspaces.ownerId,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .innerJoin(workspaceRoles, eq(workspaceRoles.id, workspaceMembers.roleId))
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

type MemberRow = Awaited<ReturnType<typeof selectMembers>>[number];

const toMember = (row: MemberRow): MemberSummary => ({
  userId: row.userId,
  name: row.name,
  email: row.email,
  avatarUrl: row.avatarUrl,
  role: { id: row.roleId, key: row.roleKey, name: row.roleName },
  isOwner: row.ownerId === row.userId,
  joinedAt: row.joinedAt,
});

/**
 * Member rows and their permission overrides, read and written in `withTenant`. Row level
 * security allows any member to read, `member:update_role` to change roles and overrides,
 * `member:remove` to delete, and a member to delete their own row. The owner's row is protected
 * by restrictive policies, so changes to it simply affect zero rows.
 */
@Injectable()
export class MembersRepository {
  constructor(private readonly database: DatabaseService) {}

  list(ctx: MemberContext): Promise<MemberSummary[]> {
    return this.database.withTenant(ctx, async (tx) => {
      const rows = await selectMembers(tx, ctx.workspaceId).orderBy(
        asc(workspaceMembers.createdAt),
        asc(users.id),
      );
      return rows.map(toMember);
    });
  }

  find(ctx: MemberContext, targetUserId: string): Promise<MemberSummary | null> {
    return this.database.withTenant(ctx, async (tx) => {
      const rows = await selectMembers(tx, ctx.workspaceId);
      const row = rows.find((candidate) => candidate.userId === targetUserId);
      return row ? toMember(row) : null;
    });
  }

  /** `false` when no row changed (unknown member, the protected owner row, or no permission). */
  changeRole(ctx: MemberContext, targetUserId: string, roleId: string): Promise<boolean> {
    return this.database.withTenant(ctx, async (tx) => {
      const updated = await tx
        .update(workspaceMembers)
        .set({ roleId })
        .where(
          and(
            eq(workspaceMembers.workspaceId, ctx.workspaceId),
            eq(workspaceMembers.userId, targetUserId),
          ),
        )
        .returning({ userId: workspaceMembers.userId });
      return updated.length > 0;
    });
  }

  /** The member's permission overrides go with them (cascading foreign key). */
  remove(ctx: MemberContext, targetUserId: string): Promise<boolean> {
    return this.database.withTenant(ctx, async (tx) => {
      const deleted = await tx
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, ctx.workspaceId),
            eq(workspaceMembers.userId, targetUserId),
          ),
        )
        .returning({ userId: workspaceMembers.userId });
      return deleted.length > 0;
    });
  }

  listOverrides(ctx: MemberContext, targetUserId: string): Promise<PermissionOverride[]> {
    return this.database.withTenant(ctx, (tx) => this.selectOverrides(tx, ctx, targetUserId));
  }

  /** Swaps the whole set in one transaction. */
  replaceOverrides(
    ctx: MemberContext,
    targetUserId: string,
    overrides: PermissionOverride[],
  ): Promise<PermissionOverride[]> {
    return this.database.withTenant(ctx, async (tx) => {
      await tx
        .delete(memberPermissionOverrides)
        .where(
          and(
            eq(memberPermissionOverrides.workspaceId, ctx.workspaceId),
            eq(memberPermissionOverrides.userId, targetUserId),
          ),
        );
      if (overrides.length > 0) {
        await tx.insert(memberPermissionOverrides).values(
          overrides.map((override) => ({
            workspaceId: ctx.workspaceId,
            userId: targetUserId,
            permissionKey: override.permissionKey,
            effect: override.effect,
          })),
        );
      }
      return this.selectOverrides(tx, ctx, targetUserId);
    });
  }

  removeOverride(
    ctx: MemberContext,
    targetUserId: string,
    permissionKey: PermissionKey,
  ): Promise<boolean> {
    return this.database.withTenant(ctx, async (tx) => {
      const deleted = await tx
        .delete(memberPermissionOverrides)
        .where(
          and(
            eq(memberPermissionOverrides.workspaceId, ctx.workspaceId),
            eq(memberPermissionOverrides.userId, targetUserId),
            eq(memberPermissionOverrides.permissionKey, permissionKey),
          ),
        )
        .returning({ key: memberPermissionOverrides.permissionKey });
      return deleted.length > 0;
    });
  }

  private async selectOverrides(
    tx: TenantTransaction,
    ctx: MemberContext,
    targetUserId: string,
  ): Promise<PermissionOverride[]> {
    const rows = await tx
      .select({
        permissionKey: memberPermissionOverrides.permissionKey,
        effect: memberPermissionOverrides.effect,
      })
      .from(memberPermissionOverrides)
      .where(
        and(
          eq(memberPermissionOverrides.workspaceId, ctx.workspaceId),
          eq(memberPermissionOverrides.userId, targetUserId),
        ),
      )
      .orderBy(asc(memberPermissionOverrides.permissionKey));
    return rows.flatMap((row) =>
      KNOWN_PERMISSIONS.has(row.permissionKey)
        ? [{ permissionKey: row.permissionKey as PermissionKey, effect: row.effect }]
        : [],
    );
  }
}
