import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

/**
 * Migration pipeline (run as the table-owning role, never as app_user):
 *   1. helper functions            script/sql/01-helper-functions.sql
 *   2. security functions          script/sql/02-security-functions.sql
 *   3. app_user least privilege    script/sql/03-app-grant-least-privilege.sql
 *   4. drizzle-generated migrations ./drizzle
 */

const SQL_DIR = join(__dirname, 'sql');
const MIGRATIONS_FOLDER = join(__dirname, '..', 'drizzle');
const SQL_STEPS = [
  '01-helper-functions.sql',
  '02-security-functions.sql',
  '03-app-grant-least-privilege.sql',
] as const;

// Arbitrary constant identifying this pipeline's advisory lock.
const MIGRATION_LOCK_ID = 727_001;

async function runSqlFile(client: Client, fileName: string): Promise<void> {
  const statements = await readFile(join(SQL_DIR, fileName), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(statements);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  console.log(`[migrate] applied ${fileName}`);
}

async function applyAppUserPassword(client: Client): Promise<void> {
  const password = process.env.APP_DB_PASSWORD;
  if (!password) {
    console.warn(
      '[migrate] APP_DB_PASSWORD not set; app_user password left unchanged',
    );
    return;
  }

  // The password travels as a bind parameter and is quoted server-side with %L.
  await client.query('BEGIN');
  try {
    await client.query(`SELECT set_config('app.migrate_pwd', $1, true)`, [
      password,
    ]);
    await client.query(
      `DO $$ BEGIN
         EXECUTE format('ALTER ROLE app_user PASSWORD %L', current_setting('app.migrate_pwd'));
       END $$`,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  console.log('[migrate] app_user password applied');
}

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL must be set');
  }

  const client = new Client({
    connectionString,
    application_name: 'syntra-gateway-migrate',
  });
  await client.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    for (const step of SQL_STEPS) {
      await runSqlFile(client, step);
    }
    await applyAppUserPassword(client);

    await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('[migrate] applied drizzle migrations');
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID])
      .catch(() => undefined);
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
