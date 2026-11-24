"use client";

import { LuSearch } from "react-icons/lu";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_ROLES_FILTER } from "@/lib/members-filter";
import type { WorkspaceRole } from "@/types/shared";

type MembersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roles: readonly WorkspaceRole[];
};

/** Search by name or email, and a filter by role. Both filter the loaded list on the client. */
export function MembersToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roles,
}: MembersToolbarProps) {
  const items: Record<string, string> = {
    [ALL_ROLES_FILTER]: "All roles",
    ...Object.fromEntries(roles.map((role) => [role.id, role.name])),
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <LuSearch
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search members"
          aria-label="Search members by name or email"
          autoComplete="off"
          className="h-9 pl-8"
        />
      </div>
      <Select
        value={roleFilter}
        items={items}
        onValueChange={(next) => {
          if (typeof next === "string") {
            onRoleFilterChange(next);
          }
        }}
      >
        <SelectTrigger
          aria-label="Filter by role"
          className="h-9 w-full sm:w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectItem value={ALL_ROLES_FILTER}>All roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
