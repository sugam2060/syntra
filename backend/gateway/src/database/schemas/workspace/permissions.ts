import { pgPolicy, pgTable, text } from 'drizzle-orm/pg-core';
import { appUser, isAuthenticated } from '../shared/rls';

/** Global permission catalog (e.g. `task:update`). Written by migrations only. */
export const permissions = pgTable(
  'permissions',
  {
    key: text().primaryKey(),
    description: text().notNull(),
  },
  () => [
    pgPolicy('permissions_select_authenticated', {
      for: 'select',
      to: appUser,
      using: isAuthenticated,
    }),
  ],
).enableRLS();

export type Permission = typeof permissions.$inferSelect;
