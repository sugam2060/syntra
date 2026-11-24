import type { Metadata } from "next";

import { SettingsLayout } from "@/components/shared/settings-layout";
import { AppShell } from "@/components/shell/app-shell";
import { WorkspaceSettings } from "@/components/workspace-settings/workspace-settings";

export const metadata: Metadata = {
  title: "Settings — Syntra",
  robots: { index: false, follow: false },
};

export default function WorkspaceSettingsPage() {
  return (
    <AppShell breadcrumb={[{ label: "Settings" }]}>
      <SettingsLayout>
        <WorkspaceSettings />
      </SettingsLayout>
    </AppShell>
  );
}
