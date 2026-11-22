import { sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { createdAt, primaryId } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { workspaceRoles } from './workspace-roles';
import { workspaces } from './workspaces';

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: primaryId(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    roleId: uuid()
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: 'restrict' }),
    tokenHash: text().notNull().unique(),
    invitedBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index('workspace_invitations_workspace_id_idx').on(table.workspaceId),
    index('workspace_invitations_role_id_idx').on(table.roleId),
    index('workspace_invitations_invited_by_idx').on(table.invitedBy),
    uniqueIndex('workspace_invitations_pending_email_uidx')
      .on(table.workspaceId, sql`lower(${table.email})`)
      .where(sql`${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL`),
    pgPolicy('workspace_invitations_select', {
      for: 'select',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:invite')
        OR lower(${table.email}) = (
          SELECT lower(u.email) FROM public.users u
          WHERE u.id = ${currentUserId} AND u.email_verified_at IS NOT NULL
        )`,
    }),
    pgPolicy('workspace_invitations_insert', {
      for: 'insert',
      to: appUser,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:invite')
        AND ${table.invitedBy} = ${currentUserId}`,
    }),
    pgPolicy('workspace_invitations_update', {
      for: 'update',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:invite')`,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'member:invite')`,
    }),
    pgPolicy('workspace_invitations_delete', {
      for: 'delete',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'member:invite')`,
    }),
  ],
).enableRLS();

export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
