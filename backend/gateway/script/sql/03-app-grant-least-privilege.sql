-- 03-app-grant-least-privilege.sql
-- Runtime role and least-privilege grants. Runs BEFORE the Drizzle migrations so that:
--   * app_user exists when policies reference it (CREATE POLICY ... TO app_user)
--   * ALTER DEFAULT PRIVILEGES covers every table/sequence the migrations create afterwards.
-- Must be executed by the migration owner (the role that will own the tables).
-- The password for app_user is applied separately by script/migrate.ts (APP_DB_PASSWORD).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
END
$$;

ALTER ROLE app_user
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;

-- No implicit access for PUBLIC.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

-- app_user may use the schemas and call the app.* functions, nothing else (no CREATE).
GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA app TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- Future functions in app are not executable by PUBLIC; grant explicitly when added.
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO app_user;

-- DML only on tables/sequences created later by this owner. RLS still decides which rows.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
