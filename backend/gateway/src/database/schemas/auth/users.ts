import { sql } from 'drizzle-orm';
import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';

export const users = pgTable(
  'users',
  {
    id: primaryId(),
    email: text().notNull(),
    name: text(),
    avatarUrl: text(),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('users_email_lower_uidx').on(sql`lower(${table.email})`),
    // Sign-up goes through app.auth_create_user() (SECURITY DEFINER), so there is no INSERT policy.
    pgPolicy('users_select_self_or_coworker', {
      for: 'select',
      to: appUser,
      using: sql`${table.id} = ${currentUserId} OR app.shares_workspace_with(${table.id})`,
    }),
    pgPolicy('users_update_self', {
      for: 'update',
      to: appUser,
      using: sql`${table.id} = ${currentUserId}`,
      withCheck: sql`${table.id} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
