"use client";

import { useMemberPermissionOverrides, useWorkspacePermissions } from "@/api/workspaces";
import { ListSkeleton } from "@/components/members/list-skeleton";
import { MemberOverridesEditor } from "@/components/members/member-overrides-editor";
import { MemberRoleControl } from "@/components/members/member-role-control";
import { PersonAvatar } from "@/components/members/person-avatar";
import { QueryError } from "@/components/members/query-error";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MemberListControls } from "@/types/members";
import type { WorkspaceMember } from "@/types/shared";

type MemberPermissionsDrawerProps = {
  workspaceId: string;
  /** The member being edited; null keeps the drawer closed. */
  member: WorkspaceMember | null;
  controls: MemberListControls;
  onClose: () => void;
};

/** Right-hand drawer to change one member's role and their permission overrides. */
export function MemberPermissionsDrawer({
  workspaceId,
  member,
  controls,
  onClose,
}: MemberPermissionsDrawerProps) {
  const catalogue = useWorkspacePermissions(member ? workspaceId : null);
  const overrides = useMemberPermissionOverrides(workspaceId, member?.userId ?? null);

  return (
    <Sheet open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-[480px]">
        {member && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-4 pr-12">
              <div className="flex items-center gap-3">
                <PersonAvatar name={member.name} email={member.email} avatarUrl={member.avatarUrl} />
                <div className="flex min-w-0 flex-col">
                  <SheetTitle className="truncate text-[15px] leading-[22px] font-semibold">
                    {member.name ?? member.email}
                  </SheetTitle>
                  <SheetDescription className="truncate text-xs leading-[18px]">
                    {member.email}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs leading-4 font-medium text-foreground">Role</span>
                <MemberRoleControl
                  member={member}
                  roles={controls.roles}
                  canGrant={controls.canGrant}
                  isSelf={false}
                  canManage
                  pending={controls.pendingUserId === member.userId}
                  onChange={(roleId) => controls.onChangeRole(member, roleId)}
                />
              </div>
            </SheetHeader>
            {catalogue.isPending || overrides.isPending ? (
              <div className="p-4">
                <ListSkeleton label="permissions" rows={6} />
              </div>
            ) : catalogue.isError || overrides.isError ? (
              <div className="p-4">
                <QueryError
                  subject="permissions"
                  error={catalogue.error ?? overrides.error}
                  onRetry={() => {
                    void catalogue.refetch();
                    void overrides.refetch();
                  }}
                />
              </div>
            ) : (
              <MemberOverridesEditor
                key={member.userId}
                workspaceId={workspaceId}
                member={member}
                catalogue={catalogue.data}
                rolePermissions={
                  new Set(
                    controls.roles.find((role) => role.id === member.role.id)?.permissions ?? [],
                  )
                }
                saved={overrides.data}
                canGrant={controls.canGrant}
                onClose={onClose}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
