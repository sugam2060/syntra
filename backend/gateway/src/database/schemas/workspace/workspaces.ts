import { sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { primaryId, timestamps } from '../shared/columns';
import { appUser } from '../shared/rls';

export const workspaces = pgTable(
  'workspaces',
  {
    id: primaryId(),
    name: text().notNull(),
    slug: text().notNull(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('workspaces_slug_uidx').on(table.slug),
    index('workspaces_owner_id_idx').on(table.ownerId),
    // Creation goes through app.create_workspace() (SECURITY DEFINER), so there is no INSERT policy.
    pgPolicy('workspaces_select_member', {
      for: 'select',
      to: appUser,
      using: sql`app.is_workspace_member(${table.id})`,
    }),
    pgPolicy('workspaces_update_permitted', {
      for: 'update',
      to: appUser,
      using: sql`app.has_permission(${table.id}, 'workspace:update')`,
      withCheck: sql`app.has_permission(${table.id}, 'workspace:update')`,
    }),
    pgPolicy('workspaces_delete_permitted', {
      for: 'delete',
      to: appUser,
      using: sql`app.has_permission(${table.id}, 'workspace:delete')`,
    }),
  ],
).enableRLS();

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
