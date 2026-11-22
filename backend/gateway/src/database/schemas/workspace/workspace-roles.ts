import { sql } from 'drizzle-orm';
import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from '../shared/columns';
import { appUser } from '../shared/rls';
import { workspaces } from './workspaces';

/**
 * Roles map to a set of permissions. System roles (workspace_id IS NULL) are global and seeded by
 * migrations; custom roles belong to one workspace.
 */
export const workspaceRoles = pgTable(
  'workspace_roles',
  {
    id: primaryId(),
    workspaceId: uuid().references(() => workspaces.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    name: text().notNull(),
    isSystem: boolean().notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    unique('workspace_roles_workspace_key_uq').on(table.workspaceId, table.key),
    // NULL workspace_id values are distinct in a plain unique constraint, so guard system role keys.
    uniqueIndex('workspace_roles_system_key_uidx')
      .on(table.key)
      .where(sql`${table.workspaceId} IS NULL`),
    pgPolicy('workspace_roles_select_visible', {
      for: 'select',
      to: appUser,
      using: sql`app.can_read_role(${table.id})`,
    }),
    pgPolicy('workspace_roles_insert_custom', {
      for: 'insert',
      to: appUser,
      withCheck: sql`${table.isSystem} = false
        AND ${table.workspaceId} IS NOT NULL
        AND app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('workspace_roles_update_custom', {
      for: 'update',
      to: appUser,
      using: sql`app.can_manage_role(${table.id})`,
      withCheck: sql`${table.isSystem} = false
        AND ${table.workspaceId} IS NOT NULL
        AND app.has_permission(${table.workspaceId}, 'member:update_role')`,
    }),
    pgPolicy('workspace_roles_delete_custom', {
      for: 'delete',
      to: appUser,
      using: sql`app.can_manage_role(${table.id})`,
    }),
  ],
).enableRLS();

export type WorkspaceRole = typeof workspaceRoles.$inferSelect;
