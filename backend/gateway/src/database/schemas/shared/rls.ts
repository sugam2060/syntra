import { sql } from 'drizzle-orm';
import { pgRole } from 'drizzle-orm/pg-core';

/**
 * Runtime login role. Created by script/sql/03-app-grant-least-privilege.sql,
 * so drizzle-kit must treat it as pre-existing.
 */
export const appUser = pgRole('app_user').existing();

export const currentUserId = sql`app.current_user_id()`;

export const isAuthenticated = sql`app.current_user_id() IS NOT NULL`;
