"use client";

import { LuEllipsis, LuTrash2 } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_KEY_STATUS } from "@/types/api-keys";
import type { ApiKeyRow } from "@/types/api-keys";

type KeyActionsMenuProps = {
  row: ApiKeyRow;
  onRevoke: (row: ApiKeyRow) => void;
};

/** The three-dot menu of a key. A revoked key has nothing left to do, so it gets no menu. */
export function KeyActionsMenu({ row, onRevoke }: KeyActionsMenuProps) {
  if (row.status === API_KEY_STATUS.revoked) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${row.key.name}`}
          />
        }
      >
        <LuEllipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem variant="destructive" onClick={() => onRevoke(row)}>
          <LuTrash2 aria-hidden="true" />
          Revoke key
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
