"use client";

import { DangerZoneRow } from "@/components/workspace-settings/danger-zone-row";
import { DeleteWorkspaceDialog } from "@/components/workspace-settings/delete-workspace-dialog";
import { LeaveWorkspaceDialog } from "@/components/workspace-settings/leave-workspace-dialog";
import { SettingsSectionCard } from "@/components/workspace-settings/settings-section-card";
import { useWorkspace } from "@/providers/workspace-provider";

/**
 * Destructive actions. The owner can delete the workspace but not leave it; everyone else can leave
 * and never sees "Delete workspace". Both are UI hints: the gateway still enforces the permissions.
 */
export function DangerZoneSection() {
  const { access } = useWorkspace();

  return (
    <SettingsSectionCard
      titleId="danger-zone-heading"
      title="Danger zone"
      tone="danger"
    >
      <div className="flex flex-col gap-4 p-4 pt-3">
        {access.canDeleteWorkspace ? (
          <DangerZoneRow
            title="Delete workspace"
            description="Permanently deletes this workspace and everything in it. This can't be undone."
            action={<DeleteWorkspaceDialog />}
          />
        ) : (
          <DangerZoneRow
            title="Leave workspace"
            description="You'll lose access to this workspace. An admin can invite you again."
            action={<LeaveWorkspaceDialog />}
          />
        )}
        {access.isOwner && (
          <p className="text-sm leading-[21px] text-muted-foreground">
            Owners can&apos;t leave a workspace. Ownership transfer isn&apos;t
            available yet.
          </p>
        )}
      </div>
    </SettingsSectionCard>
  );
}
