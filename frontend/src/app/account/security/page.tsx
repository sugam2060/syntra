import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSecurityContent } from "@/components/account-security/account-security-content";
import { LinkResultSlot } from "@/components/account-security/link-result-slot";
import { PageHeader } from "@/components/shared/page-header";
import { AccountShell } from "@/components/shell/account-shell";

export const metadata: Metadata = {
  title: "Security — Syntra",
  robots: { index: false, follow: false },
};

export default function AccountSecurityPage({
  searchParams,
}: PageProps<"/account/security">) {
  return (
    <AccountShell breadcrumb={[{ label: "Security" }]}>
      <div className="flex max-w-[680px] flex-col gap-6">
        <PageHeader title="Security" description="Manage how you sign in." />
        <Suspense fallback={null}>
          <LinkResultSlot searchParams={searchParams} />
        </Suspense>
        <AccountSecurityContent />
      </div>
    </AccountShell>
  );
}
