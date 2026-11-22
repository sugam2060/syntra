-- 02-security-functions.sql
-- Security functions used by RLS policies and by pre-authentication flows.
--
-- Notes:
--  * This file runs BEFORE the Drizzle tables exist, so every function that touches a table is
--    plpgsql (relations are resolved at call time, not at CREATE time).
--  * SECURITY DEFINER functions run as the migration owner, who owns the tables and is therefore
--    not subject to RLS (we deliberately do not FORCE RLS). This is what lets policies call
--    them without recursing into the policies of the tables they read.
--  * Every SECURITY DEFINER function pins search_path and schema-qualifies every relation.

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- Request context (set per transaction via set_config(..., true))
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT nullif(current_setting('app.workspace_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Workspace membership and permissions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = app.current_user_id()
  );
END;
$$;

-- True when the given user is the owner of the workspace (used to protect the owner's member row).
CREATE OR REPLACE FUNCTION app.is_owner_of(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION app.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
BEGIN
  IF v_user_id IS NULL OR p_workspace_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = p_workspace_id AND m.user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = v_user_id
  );
END;
$$;

-- Effective permission resolution:
--   1. workspace owner            -> allowed
--   2. not a member               -> denied
--   3. member override 'deny'     -> denied
--   4. member override 'allow'    -> allowed
--   5. otherwise                  -> granted by the member's role
CREATE OR REPLACE FUNCTION app.has_permission(p_workspace_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
  v_result boolean;
BEGIN
  IF v_user_id IS NULL OR p_workspace_id IS NULL OR p_permission IS NULL THEN
    RETURN false;
  END IF;

  -- Single statement: every join is a primary-key lookup.
  SELECT CASE
           WHEN w.owner_id = v_user_id THEN true
           WHEN m.user_id IS NULL THEN false
           WHEN o.effect IS NOT NULL THEN o.effect = 'allow'
           ELSE EXISTS (
             SELECT 1 FROM public.role_permissions rp
             WHERE rp.role_id = m.role_id AND rp.permission_key = p_permission
           )
         END
  INTO v_result
  FROM public.workspaces w
  LEFT JOIN public.workspace_members m
    ON m.workspace_id = w.id AND m.user_id = v_user_id
  LEFT JOIN public.member_permission_overrides o
    ON o.workspace_id = w.id AND o.user_id = v_user_id AND o.permission_key = p_permission
  WHERE w.id = p_workspace_id;

  RETURN COALESCE(v_result, false);
END;
$$;

-- True when the role is a custom (non-system) role the caller may manage.
CREATE OR REPLACE FUNCTION app.can_manage_role(p_role_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT r.workspace_id INTO v_workspace_id
  FROM public.workspace_roles r
  WHERE r.id = p_role_id AND r.is_system = false;

  IF v_workspace_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN app.has_permission(v_workspace_id, 'member:update_role');
END;
$$;

-- True when the role is visible to the caller: a system role, or a role of a workspace they belong to.
CREATE OR REPLACE FUNCTION app.can_read_role(p_role_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
  v_found boolean;
BEGIN
  IF app.current_user_id() IS NULL THEN
    RETURN false;
  END IF;

  SELECT true, r.workspace_id INTO v_found, v_workspace_id
  FROM public.workspace_roles r
  WHERE r.id = p_role_id;

  IF v_found IS NOT TRUE THEN
    RETURN false;
  END IF;

  RETURN v_workspace_id IS NULL OR app.is_workspace_member(v_workspace_id);
END;
$$;

-- True when the other user belongs to at least one workspace the caller belongs to.
CREATE OR REPLACE FUNCTION app.shares_workspace_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members mine
    JOIN public.workspace_members theirs ON theirs.workspace_id = mine.workspace_id
    WHERE mine.user_id = v_user_id AND theirs.user_id = p_other_user_id
  );
END;
$$;

-- Creates a workspace and the owner's member row atomically for the current user.
CREATE OR REPLACE FUNCTION app.create_workspace(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
  v_owner_role_id uuid;
  v_workspace_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'create_workspace requires an authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.id INTO v_owner_role_id
  FROM public.workspace_roles r
  WHERE r.workspace_id IS NULL AND r.key = 'owner' AND r.is_system = true;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'system owner role is missing; run migrations to seed roles';
  END IF;

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (p_name, p_slug, v_user_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES (v_workspace_id, v_user_id, v_owner_role_id);

  RETURN v_workspace_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Pre-authentication flows (no user context exists yet)
-- ---------------------------------------------------------------------------

-- Returns only what a login needs. password_hash is NULL for OAuth-only users.
CREATE OR REPLACE FUNCTION app.auth_find_user_by_email(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  email_verified_at timestamptz,
  is_active boolean,
  password_hash text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.email_verified_at, u.is_active, c.password_hash
  FROM public.users u
  LEFT JOIN public.user_credentials c ON c.user_id = u.id
  WHERE lower(u.email) = lower(p_email);
END;
$$;

CREATE OR REPLACE FUNCTION app.auth_find_oauth_account(p_provider text, p_provider_account_id text)
RETURNS TABLE (user_id uuid, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT a.user_id, u.is_active
  FROM public.oauth_accounts a
  JOIN public.users u ON u.id = a.user_id
  WHERE a.provider::text = p_provider AND a.provider_account_id = p_provider_account_id;
END;
$$;

-- Sign-up (email + password when p_password_hash is given, OAuth-only user otherwise).
CREATE OR REPLACE FUNCTION app.auth_create_user(
  p_email text,
  p_name text,
  p_password_hash text DEFAULT NULL,
  p_email_verified boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO public.users (email, name, email_verified_at)
  VALUES (p_email, p_name, CASE WHEN p_email_verified THEN now() ELSE NULL END)
  RETURNING id INTO v_user_id;

  IF p_password_hash IS NOT NULL THEN
    INSERT INTO public.user_credentials (user_id, password_hash)
    VALUES (v_user_id, p_password_hash);
  END IF;

  RETURN v_user_id;
END;
$$;
