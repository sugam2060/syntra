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
  -- is_active follows verification: a new account cannot sign in until its email is verified.
  INSERT INTO public.users (email, name, email_verified_at, is_active)
  VALUES (p_email, p_name, CASE WHEN p_email_verified THEN now() ELSE NULL END, p_email_verified)
  RETURNING id INTO v_user_id;

  IF p_password_hash IS NOT NULL THEN
    INSERT INTO public.user_credentials (user_id, password_hash)
    VALUES (v_user_id, p_password_hash);
  END IF;

  RETURN v_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Session rotation and token lifecycle (no user context exists yet)
-- ---------------------------------------------------------------------------

-- Atomically rotates a refresh session. Returns a status instead of raising so that the
-- revocation performed on reuse detection is committed rather than rolled back.
--   ok      old session revoked, new session created for user_id
--   reuse   the old token was already revoked: every session of that user is revoked
--   invalid unknown, expired, or owned by an inactive user
CREATE OR REPLACE FUNCTION app.auth_rotate_session(
  p_old_hash text,
  p_new_hash text,
  p_expires_at timestamptz,
  p_user_agent text,
  p_ip inet
)
RETURNS TABLE (user_id uuid, status text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_session record;
BEGIN
  SELECT s.id, s.user_id, s.revoked_at, s.rotated_at, s.expires_at
  INTO v_session
  FROM public.sessions s
  WHERE s.refresh_token_hash = p_old_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  -- A token that was already rotated can only be replayed by someone holding a stale copy:
  -- treat it as theft and end every session of the user.
  IF v_session.rotated_at IS NOT NULL THEN
    UPDATE public.sessions
    SET revoked_at = now()
    WHERE public.sessions.user_id = v_session.user_id AND public.sessions.revoked_at IS NULL;
    RETURN QUERY SELECT v_session.user_id, 'reuse'::text;
    RETURN;
  END IF;

  -- Revoked for another reason (logout, logout-all, password change): just invalid. Revoking
  -- everything here would sign out the device the user is still legitimately using.
  IF v_session.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  IF v_session.expires_at <= now()
     OR NOT EXISTS (
       SELECT 1 FROM public.users u WHERE u.id = v_session.user_id AND u.is_active
     ) THEN
    RETURN QUERY SELECT NULL::uuid, 'invalid'::text;
    RETURN;
  END IF;

  UPDATE public.sessions SET revoked_at = now(), rotated_at = now() WHERE id = v_session.id;

  INSERT INTO public.sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
  VALUES (v_session.user_id, p_new_hash, p_user_agent, p_ip, p_expires_at);

  RETURN QUERY SELECT v_session.user_id, 'ok'::text;
END;
$$;

-- Logout from the refresh cookie alone. Returns true when an active session was revoked.
CREATE OR REPLACE FUNCTION app.auth_revoke_session(p_hash text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.sessions
  SET revoked_at = now()
  WHERE refresh_token_hash = p_hash AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- Creates a password-reset token for an active user found by email. Returns no row when
-- the email is unknown so callers can respond identically either way.
CREATE OR REPLACE FUNCTION app.auth_create_reset_token(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS TABLE (user_id uuid, email text, name text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT u.id, u.email, u.name INTO v_user
  FROM public.users u
  WHERE lower(u.email) = lower(p_email)
    AND (u.is_active OR u.email_verified_at IS NULL);

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.verification_tokens
  SET consumed_at = now()
  WHERE public.verification_tokens.user_id = v_user.id
    AND type = 'password_reset'
    AND consumed_at IS NULL;

  INSERT INTO public.verification_tokens (user_id, type, token_hash, expires_at)
  VALUES (v_user.id, 'password_reset', p_token_hash, p_expires_at);

  RETURN QUERY SELECT v_user.id, v_user.email, v_user.name;
END;
$$;

-- Single-use token consumption. The UPDATE takes the row lock, so two concurrent calls with
-- the same token cannot both succeed.
CREATE OR REPLACE FUNCTION app.auth_consume_token(p_type text, p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE public.verification_tokens
  SET consumed_at = now()
  WHERE token_hash = p_token_hash
    AND type::text = p_type
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING public.verification_tokens.user_id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- OAuth sign-up: creates the user (email already verified by the provider) and the linked
-- account atomically. Provider tokens are intentionally not stored.
CREATE OR REPLACE FUNCTION app.auth_create_oauth_user(
  p_email text,
  p_name text,
  p_avatar_url text,
  p_provider text,
  p_provider_account_id text
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
  INSERT INTO public.users (email, name, avatar_url, email_verified_at)
  VALUES (p_email, p_name, p_avatar_url, now())
  RETURNING id INTO v_user_id;

  INSERT INTO public.oauth_accounts (user_id, provider, provider_account_id, provider_email)
  VALUES (v_user_id, p_provider::public.oauth_provider, p_provider_account_id, p_email);

  RETURN v_user_id;
END;
$$;

-- Creates a fresh email-verification token for an account whose email is not verified yet.
-- Returns no row for unknown or already verified emails so callers answer identically either way.
-- Earlier unused verification tokens of the user are superseded.
CREATE OR REPLACE FUNCTION app.auth_create_verification_token(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS TABLE (user_id uuid, email text, name text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT u.id, u.email, u.name INTO v_user
  FROM public.users u
  WHERE lower(u.email) = lower(p_email) AND u.email_verified_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.verification_tokens
  SET consumed_at = now()
  WHERE public.verification_tokens.user_id = v_user.id
    AND type = 'email_verification'
    AND consumed_at IS NULL;

  INSERT INTO public.verification_tokens (user_id, type, token_hash, expires_at)
  VALUES (v_user.id, 'email_verification', p_token_hash, p_expires_at);

  RETURN QUERY SELECT v_user.id, v_user.email, v_user.name;
END;
$$;

-- ---------------------------------------------------------------------------
-- API keys (authentication happens before any user context exists)
-- ---------------------------------------------------------------------------

-- Looks a key up by the SHA-256 of the presented key. Returns no row for an unknown key; the
-- caller decides what to do with revoked or expired keys. Touches last_used_at at most once
-- every 5 minutes so authentication does not turn every request into a write.
CREATE OR REPLACE FUNCTION app.auth_find_api_key(p_key_hash text)
RETURNS TABLE (
  api_key_id uuid,
  workspace_id uuid,
  created_by uuid,
  permissions text[],
  expires_at timestamptz,
  revoked_at timestamptz,
  creator_active boolean,
  creator_email text,
  creator_email_verified boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_key record;
BEGIN
  SELECT k.id, k.workspace_id, k.created_by, k.permissions, k.expires_at, k.revoked_at,
         k.last_used_at, u.is_active AS active, u.email AS email,
         (u.email_verified_at IS NOT NULL) AS verified
  INTO v_key
  FROM public.api_keys k
  JOIN public.users u ON u.id = k.created_by
  WHERE k.key_hash = p_key_hash;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_key.revoked_at IS NULL
     AND (v_key.expires_at IS NULL OR v_key.expires_at > now())
     AND (v_key.last_used_at IS NULL OR v_key.last_used_at < now() - interval '5 minutes') THEN
    UPDATE public.api_keys SET last_used_at = now() WHERE public.api_keys.id = v_key.id;
  END IF;

  RETURN QUERY SELECT v_key.id, v_key.workspace_id, v_key.created_by, v_key.permissions,
                      v_key.expires_at, v_key.revoked_at, v_key.active, v_key.email, v_key.verified;
END;
$$;

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------

-- Deletes expired authentication data and returns how many rows of each kind were removed.
--   * sessions: only those that EXPIRED more than a day ago. Revoked-but-unexpired sessions are
--     kept on purpose: refresh-token reuse detection needs them until they expire.
--   * verification tokens: expired or consumed more than 7 days ago.
--   * API keys: revoked or expired more than 90 days ago.
CREATE OR REPLACE FUNCTION app.auth_purge_expired()
RETURNS TABLE (sessions_deleted bigint, tokens_deleted bigint, api_keys_deleted bigint)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_sessions bigint;
  v_tokens bigint;
  v_keys bigint;
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM public.verification_tokens
  WHERE expires_at < now() - interval '7 days'
     OR consumed_at < now() - interval '7 days';
  GET DIAGNOSTICS v_tokens = ROW_COUNT;

  DELETE FROM public.api_keys
  WHERE revoked_at < now() - interval '90 days'
     OR expires_at < now() - interval '90 days';
  GET DIAGNOSTICS v_keys = ROW_COUNT;

  RETURN QUERY SELECT v_sessions, v_tokens, v_keys;
END;
$$;

-- ---------------------------------------------------------------------------
-- Workspaces and invitations
-- Row level security hides workspaces from non-members and blocks invitees from writing their
-- own member row, so these flows run as SECURITY DEFINER with explicit checks.
-- ---------------------------------------------------------------------------

-- True when no workspace uses the slug (case-insensitive). Callers must be signed in so the
-- endpoint cannot be used anonymously to enumerate workspaces.
CREATE OR REPLACE FUNCTION app.workspace_slug_available(p_slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF app.current_user_id() IS NULL THEN
    RAISE EXCEPTION 'workspace_slug_available requires an authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE lower(w.slug) = lower(p_slug)
  );
END;
$$;

-- What the accept page needs to show before sign-in, looked up by the SHA-256 of the emailed
-- token. Returns no row for an unknown token and never exposes ids.
CREATE OR REPLACE FUNCTION app.preview_workspace_invitation(p_token_hash text)
RETURNS TABLE (
  workspace_name text,
  role_name text,
  inviter_name text,
  invited_email text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT w.name,
         r.name,
         u.name,
         i.email,
         CASE
           WHEN i.accepted_at IS NOT NULL THEN 'accepted'
           WHEN i.revoked_at IS NOT NULL THEN 'revoked'
           WHEN i.expires_at <= now() THEN 'expired'
           ELSE 'pending'
         END,
         i.expires_at
  FROM public.workspace_invitations i
  JOIN public.workspaces w ON w.id = i.workspace_id
  JOIN public.workspace_roles r ON r.id = i.role_id
  JOIN public.users u ON u.id = i.invited_by
  WHERE i.token_hash = p_token_hash;
$$;

-- Pending invitations addressed to the current user's VERIFIED email, with the workspace and
-- role names the member-only policies would otherwise hide from a non-member.
CREATE OR REPLACE FUNCTION app.list_my_workspace_invitations()
RETURNS TABLE (
  invitation_id uuid,
  workspace_name text,
  workspace_slug text,
  role_name text,
  inviter_name text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'list_my_workspace_invitations requires an authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT i.id, w.name, w.slug, r.name, u.name, i.expires_at, i.created_at
  FROM public.users me
  JOIN public.workspace_invitations i ON lower(i.email) = lower(me.email)
  JOIN public.workspaces w ON w.id = i.workspace_id
  JOIN public.workspace_roles r ON r.id = i.role_id
  JOIN public.users u ON u.id = i.invited_by
  WHERE me.id = v_user_id
    AND me.email_verified_at IS NOT NULL
    AND me.is_active
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- Accepts an invitation addressed to the current user, by emailed token hash OR by invitation id
-- (exactly one). The invitee's email must be verified and match the invitation (case-insensitive).
-- The single UPDATE takes the row lock, so two concurrent accepts cannot both succeed. The owner
-- role is never granted through an invitation. Already being a member is not an error: the
-- invitation is consumed and the workspace id is returned. Returns the workspace id.
--   42501 email_not_verified   the caller has no verified email
--   P0002 invitation_invalid   unknown, expired, revoked, used, or not addressed to the caller
--   22023                      wrong argument combination
CREATE OR REPLACE FUNCTION app.accept_workspace_invitation(p_token_hash text, p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
  v_email text;
  v_workspace_id uuid;
  v_role_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'accept_workspace_invitation requires an authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  IF (p_token_hash IS NULL) = (p_invitation_id IS NULL) THEN
    RAISE EXCEPTION 'provide exactly one of token hash and invitation id'
      USING ERRCODE = '22023';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM public.users u
  WHERE u.id = v_user_id AND u.is_active AND u.email_verified_at IS NOT NULL;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'email_not_verified' USING ERRCODE = '42501';
  END IF;

  UPDATE public.workspace_invitations i
  SET accepted_at = now()
  FROM public.workspace_roles r
  WHERE r.id = i.role_id
    AND NOT (r.is_system AND r.key = 'owner')
    AND ((p_token_hash IS NOT NULL AND i.token_hash = p_token_hash)
         OR (p_invitation_id IS NOT NULL AND i.id = p_invitation_id))
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
    AND lower(i.email) = v_email
  RETURNING i.workspace_id, i.role_id INTO v_workspace_id, v_role_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_invalid' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
  VALUES (v_workspace_id, v_user_id, v_role_id)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_workspace_id;
END;
$$;

-- Declines (revokes) a pending invitation addressed to the current user's verified email.
-- Returns false when there is nothing to decline.
CREATE OR REPLACE FUNCTION app.decline_workspace_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_user_id uuid := app.current_user_id();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'decline_workspace_invitation requires an authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM public.users u
  WHERE u.id = v_user_id AND u.is_active AND u.email_verified_at IS NOT NULL;

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.workspace_invitations i
  SET revoked_at = now()
  WHERE i.id = p_invitation_id
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND lower(i.email) = v_email;

  RETURN FOUND;
END;
$$;

-- Deletes invitations that were accepted, revoked or expired more than 30 days ago. Pending and
-- recently finished invitations are kept. Returns how many rows were removed.
CREATE OR REPLACE FUNCTION app.purge_workspace_invitations()
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM public.workspace_invitations
  WHERE expires_at < now() - interval '30 days'
     OR revoked_at < now() - interval '30 days'
     OR accepted_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
