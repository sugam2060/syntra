"use client";

import { RolePill } from "@/components/members/role-pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { canAssignRole, getAssignableRoles } from "@/lib/role-permissions";
import { cn } from "@/lib/utils";
import type { WorkspaceMember, WorkspaceRole } from "@/types/shared";

type MemberRoleControlProps = {
  member: WorkspaceMember;
  roles: readonly WorkspaceRole[];
  canGrant: (permissionKey: string) => boolean;
  isSelf: boolean;
  canManage: boolean;
  /** True while this member's role is being saved. */
  pending: boolean;
  onChange: (roleId: string) => void;
  className?: string;
};

/**
 * The role of a member. The owner gets a locked pill, people without management rights see plain
 * text, the caller's own role is locked, and everyone else gets a select that saves on change.
 */
export function MemberRoleControl({
  member,
  roles,
  canGrant,
  isSelf,
  canManage,
  pending,
  onChange,
  className,
}: MemberRoleControlProps) {
  if (member.isOwner) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span tabIndex={0} className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
        >
          <RolePill name={member.role.name} isOwner />
          <span className="sr-only">Workspace owner</span>
        </TooltipTrigger>
        <TooltipContent>Workspace owner</TooltipContent>
      </Tooltip>
    );
  }

  if (!canManage) {
    return <span className="text-sm text-foreground">{member.role.name}</span>;
  }

  const assignable = getAssignableRoles(roles);
  const items = Object.fromEntries(assignable.map((role) => [role.id, role.name]));
  const trigger = (
    <Select
      value={member.role.id}
      items={items}
      disabled={isSelf || pending}
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Role of ${member.name ?? member.email}`}
        className={cn("h-7 min-w-28 rounded-full bg-surface px-3 text-xs font-medium", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="min-w-44">
        {assignable.map((role) => {
          const allowed = canAssignRole(role, canGrant);
          return (
            <SelectItem
              key={role.id}
              value={role.id}
              disabled={!allowed && role.id !== member.role.id}
              title={allowed ? undefined : "You don't have every permission in this role"}
            >
              {role.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );

  if (!isSelf) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent>You can&apos;t change your own role</TooltipContent>
    </Tooltip>
  );
}

