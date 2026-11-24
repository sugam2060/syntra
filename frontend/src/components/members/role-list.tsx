"use client";

import { LuLock, LuPlus } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/types/shared";

type RoleListProps = {
  roles: readonly WorkspaceRole[];
  selectedId: string;
  onSelect: (roleId: string) => void;
  /** Shows the "Create role" button when set. */
  onCreate?: () => void;
};

/** Roles of the workspace: built-in ones with a lock, custom ones editable. The selected role opens on the right. */
export function RoleList({ roles, selectedId, onSelect, onCreate }: RoleListProps) {
  return (
    <div className="flex flex-col gap-3">
      {onCreate && (
        <Button variant="outline" onClick={onCreate} className="w-full">
          <LuPlus aria-hidden="true" />
          Create role
        </Button>
      )}
      <ul aria-label="Roles" className="flex flex-col gap-1">
        {roles.map((role) => {
          const selected = role.id === selectedId;
          return (
            <li key={role.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(role.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "bg-accent text-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-5 font-medium">{role.name}</span>
                  <span className="text-xs leading-[18px] text-muted-foreground">
                    {role.permissions.length} {role.permissions.length === 1 ? "permission" : "permissions"}
                  </span>
                </span>
                {role.isSystem && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs leading-4 text-muted-foreground">
                    <LuLock className="size-3.5" aria-hidden="true" />
                    Built-in
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
