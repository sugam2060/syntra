"use client";

import { useState } from "react";
import { LuSearchX } from "react-icons/lu";

import { useCurrentUser } from "@/api/auth";
import { useWorkspaceMembers, useWorkspaceRoles } from "@/api/workspaces";
import { ListSkeleton } from "@/components/members/list-skeleton";
import { MemberCards } from "@/components/members/member-cards";
import { MemberPermissionsDrawer } from "@/components/members/member-permissions-drawer";
import { MembersTable } from "@/components/members/members-table";
import { MembersToolbar } from "@/components/members/members-toolbar";
import { QueryError } from "@/components/members/query-error";
import { RemoveMemberDialog } from "@/components/members/remove-member-dialog";
import { Button } from "@/components/ui/button";
import { useGrantablePermissions } from "@/hooks/use-grantable-permissions";
import { useMemberRoleChange } from "@/hooks/use-member-role-change";
import { ALL_ROLES_FILTER, filterMembers } from "@/lib/members-filter";
import { useWorkspace } from "@/providers/workspace-provider";
import type { MemberListControls } from "@/types/members";
import type { WorkspaceMember } from "@/types/shared";

/** The members of the workspace: search, filter by role, change roles, edit permissions and remove people. */
export function MembersTab() {
  const { workspace, access } = useWorkspace();
  const currentUser = useCurrentUser();
  const members = useWorkspaceMembers(workspace.id);
  const roles = useWorkspaceRoles(workspace.id);
  const { canGrant } = useGrantablePermissions();
  const roleList = roles.data ?? [];
  const { changeRole, pendingUserId } = useMemberRoleChange(workspace.id, roleList);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES_FILTER);
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  if (members.isPending || roles.isPending) {
    return <ListSkeleton label="members" />;
  }
  if (members.isError || roles.isError) {
    return (
      <QueryError
        subject="members"
        error={members.error ?? roles.error}
        onRetry={() => {
          void members.refetch();
          void roles.refetch();
        }}
      />
    );
  }

  const controls: MemberListControls = {
    roles: roles.data,
    canGrant,
    currentUserId: currentUser.data?.id ?? null,
    canManage: access.canManageMembers,
    pendingUserId,
    onChangeRole: changeRole,
    onEditPermissions: (member) => setEditingUserId(member.userId),
    onRemove: setRemoving,
  };

  const visible = filterMembers(members.data, search, roleFilter);
  const editing = members.data.find((member) => member.userId === editingUserId) ?? null;
  const isFiltering = search.trim() !== "" || roleFilter !== ALL_ROLES_FILTER;

  return (
    <div className="flex flex-col gap-4">
      <MembersToolbar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roles={roles.data}
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center">
          <LuSearchX className="size-6 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-5 font-medium text-foreground">No members found</p>
            <p className="text-xs leading-[18px] text-muted-foreground">
              Nobody matches that search. Try another name or email, or clear the filters.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setRoleFilter(ALL_ROLES_FILTER);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <MembersTable members={visible} controls={controls} />
          <MemberCards members={visible} controls={controls} />
        </>
      )}

      <p className="text-xs leading-[18px] text-muted-foreground" aria-live="polite">
        {isFiltering
          ? `${visible.length} of ${members.data.length} members`
          : `${members.data.length} ${members.data.length === 1 ? "member" : "members"}`}
      </p>

      <RemoveMemberDialog
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        member={removing}
        onClose={() => setRemoving(null)}
      />
      <MemberPermissionsDrawer
        workspaceId={workspace.id}
        member={editing}
        controls={controls}
        onClose={() => setEditingUserId(null)}
      />
    </div>
  );
}
