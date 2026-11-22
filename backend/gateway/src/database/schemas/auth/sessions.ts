import { sql } from 'drizzle-orm';
import {
  index,
  inet,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, primaryId } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text().notNull().unique(),
    userAgent: text(),
    ip: inet(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    pgPolicy('sessions_own_rows', {
      for: 'all',
      to: appUser,
      using: sql`${table.userId} = ${currentUserId}`,
      withCheck: sql`${table.userId} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type Session = typeof sessions.$inferSelect;
