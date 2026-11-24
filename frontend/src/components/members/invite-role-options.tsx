"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { INVITE_ROLE_OPTIONS } from "@/lib/invite-roles";
import { canAssignRole } from "@/lib/role-permissions";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/types/shared";

function describeRole(role: WorkspaceRole): string {
  const known = INVITE_ROLE_OPTIONS.find((option) => role.isSystem && option.key === role.key);
  if (known) {
    return known.description;
  }
  const count = role.permissions.length;
  return `Custom role with ${count} ${count === 1 ? "permission" : "permissions"}.`;
}

type InviteRoleOptionsProps = {
  /** Roles that can be offered: everything but the owner role. */
  roles: readonly WorkspaceRole[];
  value: string;
  onChange: (roleId: string) => void;
  canGrant: (permissionKey: string) => boolean;
  disabled: boolean;
};

/** Role choice for an invitation, one card per role with a one-line description. Roles the caller cannot hand out are disabled. */
export function InviteRoleOptions({
  roles,
  value,
  onChange,
  canGrant,
  disabled,
}: InviteRoleOptionsProps) {
  return (
    <RadioGroup
      value={value}
      disabled={disabled}
      aria-label="Role"
      onValueChange={(next) => {
        if (typeof next === "string") {
          onChange(next);
        }
      }}
      className="gap-2"
    >
      {roles.map((role) => {
        const selected = role.id === value;
        const allowed = canAssignRole(role, canGrant);
        return (
          <label
            key={role.id}
            className={cn(
              "flex items-start gap-3 rounded-card text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
              selected
                ? "border-2 border-primary bg-background p-[11px]"
                : "border border-border bg-surface p-3 hover:bg-background",
              allowed ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem value={role.id} disabled={!allowed} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="text-xs leading-4 font-medium text-foreground">{role.name}</span>
              <span className="text-xs leading-[18px] text-muted-foreground">
                {allowed ? describeRole(role) : "You don't hold every permission in this role."}
              </span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
