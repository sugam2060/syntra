/**
 * What the signed-in user may do in the current workspace, as the UI sees it.
 * A hint for showing or hiding controls only: the gateway enforces every permission.
 */
export type WorkspaceAccess = {
  isOwner: boolean;
  canManageMembers: boolean;
  canManageApiKeys: boolean;
  canUpdateWorkspace: boolean;
  canDeleteWorkspace: boolean;
};
