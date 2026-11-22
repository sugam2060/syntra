import { sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, primaryId } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { verificationTokenTypeEnum } from './auth.enums';
import { users } from './users';

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: verificationTokenTypeEnum().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index('verification_tokens_user_id_idx').on(table.userId),
    pgPolicy('verification_tokens_own_rows', {
      for: 'all',
      to: appUser,
      using: sql`${table.userId} = ${currentUserId}`,
      withCheck: sql`${table.userId} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type VerificationToken = typeof verificationTokens.$inferSelect;
