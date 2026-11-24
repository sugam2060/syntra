import type { WorkspaceMember, WorkspaceRole } from "@/types/shared";

/** What the members table and the mobile cards share: data to render and the actions they can start. */
export type MemberListControls = {
  roles: WorkspaceRole[];
  canGrant: (permissionKey: string) => boolean;
  currentUserId: string | null;
  /** UI hint only: the gateway enforces who may change roles or remove people. */
  canManage: boolean;
  /** The member whose role change is in flight. */
  pendingUserId: string | null;
  onChangeRole: (member: WorkspaceMember, roleId: string) => void;
  onEditPermissions: (member: WorkspaceMember) => void;
  onRemove: (member: WorkspaceMember) => void;
};
