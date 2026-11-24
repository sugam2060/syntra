import type { WorkspaceRole } from "@/types/shared";

/** Roles that can be given to a member or offered in an invitation: everything except the owner role. */
export function getAssignableRoles(roles: readonly WorkspaceRole[]): WorkspaceRole[] {
  return roles.filter((role) => !(role.isSystem && role.key === "owner"));
}

/**
 * Whether the caller may hand out the role: they must hold every permission in it. A UI hint, the
 * gateway still answers 403.
 */
export function canAssignRole(
  role: WorkspaceRole,
  canGrant: (permissionKey: string) => boolean,
): boolean {
  return role.permissions.every(canGrant);
}
