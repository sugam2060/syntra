import type { PermissionKey } from '../../database/schemas/workspace/permission-keys';

/** A role usable in a workspace: a system role (shared) or a custom role of that workspace. */
export interface RoleSummary {
  id: string;
  /** Unique within the workspace; system roles are `owner`, `admin`, `member`, `viewer`. */
  key: string;
  name: string;
  isSystem: boolean;
  permissions: PermissionKey[];
}

/** One entry of the permission catalogue. */
export interface PermissionInfo {
  key: PermissionKey;
  description: string;
}

/** Keys of the roles seeded by the migrations (`workspace_id IS NULL`). */
export const SYSTEM_ROLE_KEYS = ['owner', 'admin', 'member', 'viewer'] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];
