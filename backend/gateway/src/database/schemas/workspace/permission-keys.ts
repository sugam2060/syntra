/**
 * Every permission code, as a constant so call sites never type raw strings:
 * `@RequiredPermission(Permission.AI_USE)`.
 *
 * The database stays the source of truth for role mappings (custom roles reference the
 * `permissions` rows seeded in drizzle/0001_seed_rbac_and_triggers.sql). Adding a code means
 * one line here plus one seed row in a new custom migration; `test/database/rls.e2e-spec.ts`
 * fails if the two drift apart.
 */
export const Permission = {
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  MEMBER_INVITE: 'member:invite',
  MEMBER_REMOVE: 'member:remove',
  MEMBER_UPDATE_ROLE: 'member:update_role',
  PROJECT_READ: 'project:read',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  TASK_READ: 'task:read',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_ASSIGN: 'task:assign',
  COMMENT_CREATE: 'comment:create',
  AI_USE: 'ai:use',
  AI_MANAGE_KEYS: 'ai:manage_keys',
} as const;

/** Union of every permission code string, derived from `Permission`. */
export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/** All permission codes as an array. Tests compare it with the seeded `permissions` table. */
export const PERMISSION_KEYS: readonly PermissionKey[] = Object.values(Permission);
