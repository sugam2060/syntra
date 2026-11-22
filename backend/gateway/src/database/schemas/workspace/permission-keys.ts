/**
 * Typed list of the permission keys seeded in drizzle/0001_seed_rbac_and_triggers.sql.
 * The database remains the source of truth (custom roles reference these rows); this constant
 * gives guards and DTOs compile-time safety. test/database/rls.e2e-spec.ts asserts parity.
 */
export const PERMISSION_KEYS = [
  'workspace:read',
  'workspace:update',
  'workspace:delete',
  'member:invite',
  'member:remove',
  'member:update_role',
  'project:read',
  'project:create',
  'project:update',
  'project:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:delete',
  'task:assign',
  'comment:create',
  'ai:use',
  'ai:manage_keys',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
