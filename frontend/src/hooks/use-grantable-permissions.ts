import { useCallback, useMemo } from "react";

import { useWorkspaceRoles } from "@/api/workspaces";
import { useWorkspace } from "@/providers/workspace-provider";

/**
 * Which permission codes the caller holds, from their role in the workspace: the owner holds all of
 * them, anyone else holds what their role lists. A UI hint for disabling checkboxes; the gateway
 * still answers 403 for a code the caller lacks.
 */
export function useGrantablePermissions() {
  const { workspace, access } = useWorkspace();
  const roles = useWorkspaceRoles(access.isOwner ? null : workspace.id);

  const held = roles.data?.find((role) => role.key === workspace.role.key)?.permissions;
  const heldSet = useMemo<ReadonlySet<string> | null>(() => (held ? new Set(held) : null), [held]);

  const canGrant = useCallback(
    (code: string): boolean => access.isOwner || (heldSet?.has(code) ?? false),
    [access.isOwner, heldSet],
  );

  return {
    canGrant,
    isPending: !access.isOwner && roles.isPending,
    isError: !access.isOwner && (roles.isError || (roles.isSuccess && heldSet === null)),
    refetch: () => void roles.refetch(),
  };
}
