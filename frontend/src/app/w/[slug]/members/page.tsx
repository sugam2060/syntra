import type { Metadata } from "next";

import { MembersPage } from "@/components/members/members-page";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Members — Syntra",
  robots: { index: false, follow: false },
};

export default function WorkspaceMembersPage() {
  return (
    <AppShell breadcrumb={[{ label: "Members" }]}>
      <MembersPage />
    </AppShell>
  );
}
