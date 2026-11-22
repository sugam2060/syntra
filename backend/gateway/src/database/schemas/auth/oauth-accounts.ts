import { sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from '../shared/columns';
import { appUser, currentUserId } from '../shared/rls';
import { oauthProviderEnum } from './auth.enums';
import { users } from './users';

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum().notNull(),
    providerAccountId: text().notNull(),
    providerEmail: text(),
    // Encrypt at the application layer before storing.
    accessToken: text(),
    refreshToken: text(),
    tokenExpiresAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_uq').on(
      table.provider,
      table.providerAccountId,
    ),
    index('oauth_accounts_user_id_idx').on(table.userId),
    pgPolicy('oauth_accounts_own_rows', {
      for: 'all',
      to: appUser,
      using: sql`${table.userId} = ${currentUserId}`,
      withCheck: sql`${table.userId} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type OauthAccount = typeof oauthAccounts.$inferSelect;
