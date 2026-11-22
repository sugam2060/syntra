import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { appUser, currentUserId } from '../shared/rls';
import { users } from './users';

/** Password credentials. Only email+password users have a row; OAuth-only users have none. */
export const userCredentials = pgTable(
  'user_credentials',
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text().notNull(),
    passwordUpdatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy('user_credentials_own_rows', {
      for: 'all',
      to: appUser,
      using: sql`${table.userId} = ${currentUserId}`,
      withCheck: sql`${table.userId} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type UserCredential = typeof userCredentials.$inferSelect;
