import { sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { createdAt, primaryId } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { workspaces } from './workspaces';

/**
 * Workspace-scoped API keys for the public API. A key acts on behalf of `created_by`, limited to
 * `permissions`. Only the SHA-256 of the key is stored; the plaintext is shown once at creation.
 * Authentication looks keys up through `app.auth_find_api_key` (no user context exists yet).
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: primaryId(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** First characters of the key (`sk_` + 8), safe to display. */
    keyPrefix: text().notNull(),
    keyHash: text().notNull().unique(),
    permissions: text().array().notNull().default(sql`'{}'::text[]`),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    lastUsedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index('api_keys_workspace_id_idx').on(table.workspaceId),
    index('api_keys_created_by_idx').on(table.createdBy),
    pgPolicy('api_keys_select_manager', {
      for: 'select',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'ai:manage_keys')`,
    }),
    pgPolicy('api_keys_insert_manager', {
      for: 'insert',
      to: appUser,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'ai:manage_keys')
        AND ${table.createdBy} = ${currentUserId}`,
    }),
    // Revocation is an UPDATE of revoked_at; keys are never deleted by users.
    pgPolicy('api_keys_update_manager', {
      for: 'update',
      to: appUser,
      using: sql`app.has_permission(${table.workspaceId}, 'ai:manage_keys')`,
      withCheck: sql`app.has_permission(${table.workspaceId}, 'ai:manage_keys')`,
    }),
  ],
).enableRLS();

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
