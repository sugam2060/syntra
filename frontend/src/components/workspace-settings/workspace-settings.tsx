"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { AppearanceSection } from "@/components/workspace-settings/appearance-section";
import { DangerZoneSection } from "@/components/workspace-settings/danger-zone-section";
import { WorkspaceProfileSection } from "@/components/workspace-settings/workspace-profile-section";
import { useWorkspace } from "@/providers/workspace-provider";

/**
 * The General settings content: header, workspace profile and danger zone. Render it directly inside
 * `SettingsLayout`: its parts must be flex items of that column for the unsaved-changes bar to stick.
 */
export function WorkspaceSettings() {
  const { workspace } = useWorkspace();

  return (
    <>
      <PageHeader
        title="Workspace settings"
        description={
          <>
            Manage <span className="break-words">{workspace.name}</span>
          </>
        }
        actions={<Badge variant="outline">Your role: {workspace.role.name}</Badge>}
      />
      <WorkspaceProfileSection />
      <AppearanceSection />
      <DangerZoneSection />
    </>
  );
}
