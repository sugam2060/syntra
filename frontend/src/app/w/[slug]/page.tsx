import type { Metadata } from "next";

import { AppShell } from "@/components/shell/app-shell";
import { WorkspaceHome } from "@/components/workspace-home/workspace-home";

export const metadata: Metadata = {
  title: "Home — Syntra",
  robots: { index: false, follow: false },
};

export default function WorkspaceHomePage() {
  return (
    <AppShell breadcrumb={[{ label: "Home" }]}>
      <WorkspaceHome />
    </AppShell>
  );
}
