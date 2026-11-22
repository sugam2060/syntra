import { sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { timestamps } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { workspaceRoles } from './workspace-roles';
import { workspaces } from './workspaces';

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid()
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index('workspace_members_user_id_idx').on(table.userId),
    index('workspace_members_role_id_idx').on(table.roleId),
    pgPolicy('workspace_members_select_member', {
      for: 'select',
      to: appUser,
      using: sql`app.is_workspace_member(${table.workspaceId})`,
    }),
    pgPolicy('workspace_members_insert_permitted', {
      for: 'insert',
      to: appUser,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:invite')`,
    }),
    pgPolicy('workspace_members_update_permitted', {
      for: 'update',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('workspace_members_delete_permitted', {
      for: 'delete',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:remove')
        OR ${table.userId} = ${currentUserId}`,
    }),
    // The owner can never be demoted or removed (ownership transfer is a separate definer function).
    pgPolicy('workspace_members_protect_owner_update', {
      as: 'restrictive',
      for: 'update',
      to: appUser,
      using: sql`NOT app.is_owner_of(${table.workspaceId}, ${table.userId})`,
    }),
    pgPolicy('workspace_members_protect_owner_delete', {
      as: 'restrictive',
      for: 'delete',
      to: appUser,
      using: sql`NOT app.is_owner_of(${table.workspaceId}, ${table.userId})`,
    }),
  ],
).enableRLS();

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
