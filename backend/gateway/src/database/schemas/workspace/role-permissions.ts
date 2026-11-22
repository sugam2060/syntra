import { sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { appUser } from '../shared/rls';
import { permissions } from './permissions';
import { workspaceRoles } from './workspace-roles';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid()
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: 'cascade' }),
    permissionKey: text()
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionKey] }),
    index('role_permissions_permission_key_idx').on(table.permissionKey),
    pgPolicy('role_permissions_select_visible', {
      for: 'select',
      to: appUser,
      using: sql`app.can_read_role(${table.roleId})`,
    }),
    pgPolicy('role_permissions_insert_custom', {
      for: 'insert',
      to: appUser,
      withCheck: sql`app.can_manage_role(${table.roleId})`,
    }),
    pgPolicy('role_permissions_delete_custom', {
      for: 'delete',
      to: appUser,
      using: sql`app.can_manage_role(${table.roleId})`,
    }),
  ],
).enableRLS();

export type RolePermission = typeof rolePermissions.$inferSelect;
