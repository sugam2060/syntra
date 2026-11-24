import type { WorkspaceAccess } from "@/types/shared";

const ADMIN_ROLE_KEYS: ReadonlySet<string> = new Set(["owner", "admin"]);

/**
 * Derives what to show in the UI from the caller's role key (`owner`, `admin`, `member`, `viewer`
 * or a custom key). Custom roles get no elevated access here.
 *
 * This is a UI hint only: the workspace response carries a role key, not permission codes, and the
 * gateway still enforces every permission. Callers must handle a 403 from any request even when
 * the matching flag is true.
 */
export function getWorkspaceAccess(roleKey: string): WorkspaceAccess {
  const isOwner = roleKey === "owner";
  const isAdmin = ADMIN_ROLE_KEYS.has(roleKey);

  return {
    isOwner,
    canManageMembers: isAdmin,
    canManageApiKeys: isAdmin,
    canUpdateWorkspace: isAdmin,
    canDeleteWorkspace: isOwner,
  };
}
