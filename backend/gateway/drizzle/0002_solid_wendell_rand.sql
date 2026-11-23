CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "api_keys_created_by_idx" ON "api_keys" USING btree ("created_by");--> statement-breakpoint
CREATE POLICY "api_keys_select_manager" ON "api_keys" AS PERMISSIVE FOR SELECT TO "app_user" USING (app.has_permission("api_keys"."workspace_id", 'ai:manage_keys'));--> statement-breakpoint
CREATE POLICY "api_keys_insert_manager" ON "api_keys" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK (app.has_permission("api_keys"."workspace_id", 'ai:manage_keys')
        AND "api_keys"."created_by" = app.current_user_id());--> statement-breakpoint
CREATE POLICY "api_keys_update_manager" ON "api_keys" AS PERMISSIVE FOR UPDATE TO "app_user" USING (app.has_permission("api_keys"."workspace_id", 'ai:manage_keys')) WITH CHECK (app.has_permission("api_keys"."workspace_id", 'ai:manage_keys'));