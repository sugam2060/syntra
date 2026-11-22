import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { permissions } from './permissions';
import { permissionEffectEnum } from './workspace.enums';
import { workspaceMembers } from './workspace-members';

/** Per-member allow/deny exceptions on top of the member's role. */
export const memberPermissionOverrides = pgTable(
  'member_permission_overrides',
  {
    workspaceId: uuid().notNull(),
    userId: uuid().notNull(),
    permissionKey: text()
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
    effect: permissionEffectEnum().notNull(),
    ...timestamps(),
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.userId, table.permissionKey],
    }),
    foreignKey({
      columns: [table.workspaceId, table.userId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
      name: 'member_permission_overrides_member_fk',
    }).onDelete('cascade'),
    index('member_permission_overrides_user_id_idx').on(table.userId),
    pgPolicy('member_permission_overrides_select', {
      for: 'select',
      to: appUser,
      using: sql`${table.userId} = ${currentUserId}
        OR app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('member_permission_overrides_insert', {
      for: 'insert',
      to: appUser,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('member_permission_overrides_update', {
      for: 'update',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('member_permission_overrides_delete', {
      for: 'delete',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
  ],
).enableRLS();

export type MemberPermissionOverride =
  typeof memberPermissionOverrides.$inferSelect;
