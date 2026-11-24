"use client";

import { LuLock } from "react-icons/lu";

import { PermissionChecklist } from "@/components/members/permission-checklist";
import { RoleEditForm } from "@/components/members/role-edit-form";
import type { PermissionGroup } from "@/types/members";
import type { WorkspaceRole } from "@/types/shared";

type RoleDetailProps = {
  workspaceId: string;
  role: WorkspaceRole;
  groups: readonly PermissionGroup[];
  canGrant: (permissionKey: string) => boolean;
  /** UI hint only: the gateway decides who may change roles. */
  canManage: boolean;
  onDelete: () => void;
};

/** The selected role: editable for a custom role when the caller manages members, read-only otherwise. */
export function RoleDetail({
  workspaceId,
  role,
  groups,
  canGrant,
  canManage,
  onDelete,
}: RoleDetailProps) {
  const editable = canManage && !role.isSystem;

  return (
    <section
      aria-labelledby="role-detail-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-4"
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 id="role-detail-heading" className="text-[15px] leading-[22px] font-semibold text-foreground">
            {role.name}
          </h3>
          {role.isSystem && (
            <span className="inline-flex items-center gap-1 text-xs leading-4 text-muted-foreground">
              <LuLock className="size-3.5" aria-hidden="true" />
              Built-in
            </span>
          )}
        </div>
        <p className="text-xs leading-[18px] text-muted-foreground">
          {role.isSystem
            ? "Built-in roles are the same in every workspace and can't be changed."
            : editable
              ? "Rename this role or change what it grants."
              : "Only people who manage members can change custom roles."}
        </p>
      </header>

      {editable ? (
        <RoleEditForm
          key={role.id}
          workspaceId={workspaceId}
          role={role}
          groups={groups}
          canGrant={canGrant}
          onDelete={onDelete}
        />
      ) : (
        <PermissionChecklist groups={groups} selected={new Set(role.permissions)} />
      )}
    </section>
  );
}
