-- 01-helper-functions.sql
-- Generic, table-agnostic helpers. Idempotent: safe to run on every migration.

CREATE SCHEMA IF NOT EXISTS app;

-- UUID v7 (time-ordered) generator. Works on PostgreSQL 14+ (no uuidv7() built-in required).
-- 48-bit unix-ms timestamp in the high bits, version nibble forced to 0111, remaining bits random.
CREATE OR REPLACE FUNCTION app.uuid_v7()
RETURNS uuid
LANGUAGE sql
VOLATILE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          PLACING substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
          FROM 1 FOR 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$;

-- Trigger function keeping updated_at current.
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Attaches the updated_at trigger to a table (idempotent).
CREATE OR REPLACE FUNCTION app.attach_updated_at_trigger(p_table regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_trigger_name text := 'trg_set_updated_at';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = p_table AND tgname = v_trigger_name AND NOT tgisinternal
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()',
      v_trigger_name,
      p_table
    );
  END IF;
END;
$$;
