"use client";

import { LuCheck, LuMinus } from "react-icons/lu";

import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionGroup } from "@/types/members";
import type { PermissionInfo } from "@/types/shared";

type PermissionChecklistProps = {
  groups: readonly PermissionGroup[];
  selected: ReadonlySet<string>;
  /** Without it the list is read-only and shows a check or a dash per permission. */
  onToggle?: (permissionKey: string, checked: boolean) => void;
  /** Whether the caller may add a permission to a role. Unchecked boxes they cannot add are disabled. */
  canGrant?: (permissionKey: string) => boolean;
  disabled?: boolean;
};

function PermissionText({ permission }: { permission: PermissionInfo }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <code className="font-mono text-[13px] leading-5 text-foreground">{permission.key}</code>
      <span className="text-xs leading-[18px] text-muted-foreground">{permission.description}</span>
    </span>
  );
}

type EditableRowProps = {
  permission: PermissionInfo;
  checked: boolean;
  blocked: boolean;
  disabled: boolean;
  onToggle: (permissionKey: string, checked: boolean) => void;
};

function EditableRow({ permission, checked, blocked, disabled, onToggle }: EditableRowProps) {
  const label = (
    <label
      className={cn(
        "flex items-start gap-3 px-4 py-2.5",
        blocked || disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/60",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={blocked || disabled}
        onCheckedChange={(next) => onToggle(permission.key, next)}
        className="mt-0.5"
      />
      <PermissionText permission={permission} />
    </label>
  );

  if (!blocked) {
    return label;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{label}</TooltipTrigger>
      <TooltipContent>You don&apos;t have this permission</TooltipContent>
    </Tooltip>
  );
}

/** Permissions grouped by area, as checkboxes when editable or as check and dash marks when read-only. */
export function PermissionChecklist({
  groups,
  selected,
  onToggle,
  canGrant,
  disabled = false,
}: PermissionChecklistProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.area} aria-label={group.label} className="flex flex-col gap-2">
          <h4 className="text-xs leading-4 font-medium text-muted-foreground">{group.label}</h4>
          <ul className="overflow-hidden rounded-card border border-border">
            {group.permissions.map((permission) => {
              const checked = selected.has(permission.key);
              return (
                <li key={permission.key} className="border-b border-border last:border-b-0">
                  {onToggle ? (
                    <EditableRow
                      permission={permission}
                      checked={checked}
                      blocked={!checked && canGrant !== undefined && !canGrant(permission.key)}
                      disabled={disabled}
                      onToggle={onToggle}
                    />
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-2.5">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center",
                          checked ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {checked ? (
                          <LuCheck className="size-4" aria-hidden="true" />
                        ) : (
                          <LuMinus className="size-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">{checked ? "Included" : "Not included"}</span>
                      </span>
                      <PermissionText permission={permission} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
