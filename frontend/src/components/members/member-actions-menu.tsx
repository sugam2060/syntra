"use client";

import { useState } from "react";
import { LuEllipsis, LuShieldCheck, LuUserCog, LuUserMinus } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canAssignRole, getAssignableRoles } from "@/lib/role-permissions";
import type { MemberListControls } from "@/types/members";
import type { WorkspaceMember } from "@/types/shared";

type MemberActionsMenuProps = {
  member: WorkspaceMember;
  controls: MemberListControls;
};

/**
 * Row menu: change role, edit permission overrides, remove. The owner and the signed-in user have
 * nothing to offer (the gateway refuses both, and leaving is done from workspace settings), so those
 * rows get no menu.
 */
export function MemberActionsMenu({ member, controls }: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const isSelf = member.userId === controls.currentUserId;
  if (!controls.canManage || member.isOwner || isSelf) {
    return null;
  }

  const displayName = member.name ?? member.email;
  const assignable = getAssignableRoles(controls.roles);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${displayName}`} />}
      >
        <LuEllipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LuUserCog aria-hidden="true" />
            Change role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-44">
            <DropdownMenuRadioGroup
              value={member.role.id}
              onValueChange={(next) => {
                if (typeof next === "string") {
                  setOpen(false);
                  controls.onChangeRole(member, next);
                }
              }}
            >
              {assignable.map((role) => (
                <DropdownMenuRadioItem
                  key={role.id}
                  value={role.id}
                  disabled={!canAssignRole(role, controls.canGrant) && role.id !== member.role.id}
                >
                  {role.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => controls.onEditPermissions(member)}>
          <LuShieldCheck aria-hidden="true" />
          Edit permissions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => controls.onRemove(member)}>
          <LuUserMinus aria-hidden="true" />
          Remove from workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
