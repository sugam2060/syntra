CREATE TYPE "public"."oauth_provider" AS ENUM('google', 'github');--> statement-breakpoint
CREATE TYPE "public"."verification_token_type" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."permission_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"email_verified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_email" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_account_uq" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "oauth_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"user_agent" text,
	"ip" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refreshTokenHash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "verification_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_roles" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"workspace_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_roles_workspace_key_uq" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
ALTER TABLE "workspace_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_permission_overrides" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"effect" "permission_effect" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_permission_overrides_workspace_id_user_id_permission_key_pk" PRIMARY KEY("workspace_id","user_id","permission_key")
);
--> statement-breakpoint
ALTER TABLE "member_permission_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitations_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_roles" ADD CONSTRAINT "workspace_roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_permission_overrides" ADD CONSTRAINT "member_permission_overrides_member_fk" FOREIGN KEY ("workspace_id","user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uidx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_uidx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_roles_system_key_uidx" ON "workspace_roles" USING btree ("key") WHERE "workspace_roles"."workspace_id" IS NULL;--> statement-breakpoint
CREATE INDEX "role_permissions_permission_key_idx" ON "role_permissions" USING btree ("permission_key");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_role_id_idx" ON "workspace_members" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "member_permission_overrides_user_id_idx" ON "member_permission_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_invitations_role_id_idx" ON "workspace_invitations" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "workspace_invitations_invited_by_idx" ON "workspace_invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_pending_email_uidx" ON "workspace_invitations" USING btree ("workspace_id",lower("email")) WHERE "workspace_invitations"."accepted_at" IS NULL AND "workspace_invitations"."revoked_at" IS NULL;--> statement-breakpoint
CREATE POLICY "users_select_self_or_coworker" ON "users" AS PERMISSIVE FOR SELECT TO "app_user" USING ("users"."id" = app.current_user_id() OR app.shares_workspace_with("users"."id"));--> statement-breakpoint
CREATE POLICY "users_update_self" ON "users" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("users"."id" = app.current_user_id()) WITH CHECK ("users"."id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "user_credentials_own_rows" ON "user_credentials" AS PERMISSIVE FOR ALL TO "app_user" USING ("user_credentials"."user_id" = app.current_user_id()) WITH CHECK ("user_credentials"."user_id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "oauth_accounts_own_rows" ON "oauth_accounts" AS PERMISSIVE FOR ALL TO "app_user" USING ("oauth_accounts"."user_id" = app.current_user_id()) WITH CHECK ("oauth_accounts"."user_id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "sessions_own_rows" ON "sessions" AS PERMISSIVE FOR ALL TO "app_user" USING ("sessions"."user_id" = app.current_user_id()) WITH CHECK ("sessions"."user_id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "verification_tokens_own_rows" ON "verification_tokens" AS PERMISSIVE FOR ALL TO "app_user" USING ("verification_tokens"."user_id" = app.current_user_id()) WITH CHECK ("verification_tokens"."user_id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "permissions_select_authenticated" ON "permissions" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.current_user_id() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "workspaces_select_member" ON "workspaces" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.is_workspace_member("workspaces"."id"));--> statement-breakpoint
CREATE POLICY "workspaces_update_permitted" ON "workspaces" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.has_permission("workspaces"."id", 'workspace:update')) WITH CHECK (app.has_permission("workspaces"."id", 'workspace:update'));--> statement-breakpoint
CREATE POLICY "workspaces_delete_permitted" ON "workspaces" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.has_permission("workspaces"."id", 'workspace:delete'));--> statement-breakpoint
CREATE POLICY "workspace_roles_select_visible" ON "workspace_roles" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.can_read_role("workspace_roles"."id"));--> statement-breakpoint
CREATE POLICY "workspace_roles_insert_custom" ON "workspace_roles" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("workspace_roles"."is_system" = false
        AND "workspace_roles"."workspace_id" IS NOT NULL
        AND app.has_permission("workspace_roles"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "workspace_roles_update_custom" ON "workspace_roles" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.can_manage_role("workspace_roles"."id")) WITH CHECK ("workspace_roles"."is_system" = false
        AND "workspace_roles"."workspace_id" IS NOT NULL
        AND app.has_permission("workspace_roles"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "workspace_roles_delete_custom" ON "workspace_roles" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.can_manage_role("workspace_roles"."id"));--> statement-breakpoint
CREATE POLICY "role_permissions_select_visible" ON "role_permissions" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.can_read_role("role_permissions"."role_id"));--> statement-breakpoint
CREATE POLICY "role_permissions_insert_custom" ON "role_permissions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK (app.can_manage_role("role_permissions"."role_id"));--> statement-breakpoint
CREATE POLICY "role_permissions_delete_custom" ON "role_permissions" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.can_manage_role("role_permissions"."role_id"));--> statement-breakpoint
CREATE POLICY "workspace_members_select_member" ON "workspace_members" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.is_workspace_member("workspace_members"."workspace_id"));--> statement-breakpoint
CREATE POLICY "workspace_members_insert_permitted" ON "workspace_members" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK (app.has_permission("workspace_members"."workspace_id", 'member:invite'));--> statement-breakpoint
CREATE POLICY "workspace_members_update_permitted" ON "workspace_members" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.has_permission("workspace_members"."workspace_id", 'member:update_role')) WITH CHECK (app.has_permission("workspace_members"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "workspace_members_delete_permitted" ON "workspace_members" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.has_permission("workspace_members"."workspace_id", 'member:remove')
        OR "workspace_members"."user_id" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "workspace_members_protect_owner_update" ON "workspace_members" AS RESTRICTIVE FOR UPDATE TO "app_user" USING (NOT app.is_owner_of("workspace_members"."workspace_id", "workspace_members"."user_id"));--> statement-breakpoint
CREATE POLICY "workspace_members_protect_owner_delete" ON "workspace_members" AS RESTRICTIVE FOR DELETE TO "app_user" USING (NOT app.is_owner_of("workspace_members"."workspace_id", "workspace_members"."user_id"));--> statement-breakpoint
CREATE POLICY "member_permission_overrides_select" ON "member_permission_overrides" AS PERMISSIVE FOR SELECT TO "app_user" USING ("member_permission_overrides"."user_id" = app.current_user_id()
        OR app.has_permission("member_permission_overrides"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "member_permission_overrides_insert" ON "member_permission_overrides" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK (app.has_permission("member_permission_overrides"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "member_permission_overrides_update" ON "member_permission_overrides" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.has_permission("member_permission_overrides"."workspace_id", 'member:update_role')) WITH CHECK (app.has_permission("member_permission_overrides"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "member_permission_overrides_delete" ON "member_permission_overrides" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.has_permission("member_permission_overrides"."workspace_id", 'member:update_role'));--> statement-breakpoint
CREATE POLICY "workspace_invitations_select" ON "workspace_invitations" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.has_permission("workspace_invitations"."workspace_id", 'member:invite')
        OR lower("workspace_invitations"."email") = (
          SELECT lower(u.email) FROM public.users u
          WHERE u.id = app.current_user_id() AND u.email_verified_at IS NOT NULL
        ));--> statement-breakpoint
CREATE POLICY "workspace_invitations_insert" ON "workspace_invitations" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK (app.has_permission("workspace_invitations"."workspace_id", 'member:invite')
        AND "workspace_invitations"."invited_by" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "workspace_invitations_update" ON "workspace_invitations" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.has_permission("workspace_invitations"."workspace_id", 'member:invite')) WITH CHECK (app.has_permission("workspace_invitations"."workspace_id", 'member:invite'));--> statement-breakpoint
CREATE POLICY "workspace_invitations_delete" ON "workspace_invitations" AS PERMISSIVE FOR DELETE TO "app_user" USING (app.has_permission("workspace_invitations"."workspace_id", 'member:invite'));