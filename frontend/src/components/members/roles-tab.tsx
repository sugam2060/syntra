"use client";

import { useMemo, useState } from "react";

import { useWorkspacePermissions, useWorkspaceRoles } from "@/api/workspaces";
import { CreateRoleDialog } from "@/components/members/create-role-dialog";
import { DeleteRoleDialog } from "@/components/members/delete-role-dialog";
import { ListSkeleton } from "@/components/members/list-skeleton";
import { QueryError } from "@/components/members/query-error";
import { RoleDetail } from "@/components/members/role-detail";
import { RoleList } from "@/components/members/role-list";
import { useGrantablePermissions } from "@/hooks/use-grantable-permissions";
import { groupPermissions } from "@/lib/permission-groups";
import { useWorkspace } from "@/providers/workspace-provider";

/** Built-in and custom roles with their permissions. People who manage members can create, edit and delete custom roles. */
export function RolesTab() {
  const { workspace, access } = useWorkspace();
  const roles = useWorkspaceRoles(workspace.id);
  const catalogue = useWorkspacePermissions(workspace.id);
  const { canGrant } = useGrantablePermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const groups = useMemo(() => groupPermissions(catalogue.data ?? []), [catalogue.data]);

  if (roles.isPending || catalogue.isPending) {
    return <ListSkeleton label="roles" rows={4} />;
  }
  if (roles.isError || catalogue.isError) {
    return (
      <QueryError
        subject="roles"
        error={roles.error ?? catalogue.error}
        onRetry={() => {
          void roles.refetch();
          void catalogue.refetch();
        }}
      />
    );
  }

  const selected = roles.data.find((role) => role.id === selectedId) ?? roles.data[0];

  return (
    <div className="grid items-start gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <RoleList
        roles={roles.data}
        selectedId={selected?.id ?? ""}
        onSelect={setSelectedId}
        onCreate={access.canManageMembers ? () => setCreateOpen(true) : undefined}
      />
      {selected && (
        <RoleDetail
          workspaceId={workspace.id}
          role={selected}
          groups={groups}
          canGrant={canGrant}
          canManage={access.canManageMembers}
          onDelete={() => setDeleteOpen(true)}
        />
      )}
      <CreateRoleDialog
        workspaceId={workspace.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        canGrant={canGrant}
        onCreated={setSelectedId}
      />
      <DeleteRoleDialog
        workspaceId={workspace.id}
        role={deleteOpen && selected && !selected.isSystem ? selected : null}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
