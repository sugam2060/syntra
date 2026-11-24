import type { Metadata } from "next";

import { ApiKeysPageContent } from "@/components/api-keys/api-keys-page-content";
import { SettingsLayout } from "@/components/shared/settings-layout";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "API keys — Syntra",
  robots: { index: false, follow: false },
};

export default function ApiKeysPage() {
  return (
    <AppShell breadcrumb={[{ label: "Settings" }, { label: "API keys" }]}>
      <SettingsLayout contentClassName="max-w-[1040px]">
        <ApiKeysPageContent />
      </SettingsLayout>
    </AppShell>
  );
}
