-- Custom migration: RBAC catalog seed, updated_at triggers, catalog write lockdown.
-- Seeds are idempotent so they can be extended by later migrations.

-- 1. Permission catalog
INSERT INTO "permissions" ("key", "description") VALUES
  ('workspace:read', 'View the workspace'),
  ('workspace:update', 'Edit workspace settings'),
  ('workspace:delete', 'Delete the workspace'),
  ('member:invite', 'Invite and add members'),
  ('member:remove', 'Remove members'),
  ('member:update_role', 'Change member roles and permission overrides'),
  ('project:read', 'View projects'),
  ('project:create', 'Create projects'),
  ('project:update', 'Edit projects'),
  ('project:delete', 'Delete projects'),
  ('task:read', 'View tasks'),
  ('task:create', 'Create tasks'),
  ('task:update', 'Edit tasks'),
  ('task:delete', 'Delete tasks'),
  ('task:assign', 'Assign tasks'),
  ('comment:create', 'Comment on tasks'),
  ('ai:use', 'Use AI agents'),
  ('ai:manage_keys', 'Manage AI API keys')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- 2. System roles (global: workspace_id IS NULL)
INSERT INTO "workspace_roles" ("key", "name", "is_system") VALUES
  ('owner', 'Owner', true),
  ('admin', 'Admin', true),
  ('member', 'Member', true),
  ('viewer', 'Viewer', true)
ON CONFLICT ("key") WHERE "workspace_id" IS NULL DO NOTHING;
--> statement-breakpoint

-- 3. Role -> permission mapping
-- owner: everything
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "workspace_roles" r CROSS JOIN "permissions" p
WHERE r."workspace_id" IS NULL AND r."key" = 'owner'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- admin: everything except deleting the workspace
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "workspace_roles" r CROSS JOIN "permissions" p
WHERE r."workspace_id" IS NULL AND r."key" = 'admin' AND p."key" <> 'workspace:delete'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- member: read everything, create/update project work, comment, use AI
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "workspace_roles" r
JOIN "permissions" p ON p."key" IN (
  'workspace:read', 'project:read', 'project:create', 'project:update',
  'task:read', 'task:create', 'task:update', 'task:assign', 'comment:create', 'ai:use'
)
WHERE r."workspace_id" IS NULL AND r."key" = 'member'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- viewer: read only
INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "workspace_roles" r
JOIN "permissions" p ON p."key" IN ('workspace:read', 'project:read', 'task:read')
WHERE r."workspace_id" IS NULL AND r."key" = 'viewer'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 4. updated_at triggers
SELECT app.attach_updated_at_trigger('public.users'::regclass);
--> statement-breakpoint
SELECT app.attach_updated_at_trigger('public.oauth_accounts'::regclass);
--> statement-breakpoint
SELECT app.attach_updated_at_trigger('public.workspaces'::regclass);
--> statement-breakpoint
SELECT app.attach_updated_at_trigger('public.workspace_roles'::regclass);
--> statement-breakpoint
SELECT app.attach_updated_at_trigger('public.workspace_members'::regclass);
--> statement-breakpoint
SELECT app.attach_updated_at_trigger('public.member_permission_overrides'::regclass);
--> statement-breakpoint

-- 5. Defense in depth: the catalog is read-only for the runtime role (RLS has no write policy either).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "permissions" FROM "app_user";
