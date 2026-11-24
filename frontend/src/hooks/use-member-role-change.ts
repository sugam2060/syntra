import { toast } from "sonner";

import { useChangeMemberRole } from "@/api/workspaces";
import { getErrorMessage } from "@/lib/error-message";
import type { WorkspaceMember, WorkspaceRole } from "@/types/shared";

/** Changes a member's role and reports the outcome with a toast. The gateway's own message explains a 403. */
export function useMemberRoleChange(workspaceId: string, roles: readonly WorkspaceRole[]) {
  const mutation = useChangeMemberRole(workspaceId);

  function changeRole(member: WorkspaceMember, roleId: string): void {
    if (roleId === member.role.id) {
      return;
    }
    const roleName = roles.find((role) => role.id === roleId)?.name ?? "the new role";
    mutation.mutate(
      { userId: member.userId, roleId },
      {
        onSuccess: () =>
          toast.success(`${member.name ?? member.email} is now ${roleName}`),
        onError: (error) =>
          toast.error(getErrorMessage(error, "Couldn't change the role. Try again.")),
      },
    );
  }

  return {
    changeRole,
    pendingUserId: mutation.isPending ? (mutation.variables?.userId ?? null) : null,
  };
}
