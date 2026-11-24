import type { Metadata } from "next";
import { Suspense } from "react";

import { InviteTeamContent } from "@/components/onboarding/invite-team-content";
import { InviteTeamSkeleton } from "@/components/onboarding/invite-team-skeleton";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export const metadata: Metadata = {
  title: "Invite your team — Syntra",
  robots: { index: false, follow: false },
};

export default function InviteTeamPage({
  searchParams,
}: PageProps<"/onboarding/invite">) {
  return (
    <OnboardingShell step={3}>
      <Suspense fallback={<InviteTeamSkeleton />}>
        <InviteTeamContent searchParams={searchParams} />
      </Suspense>
    </OnboardingShell>
  );
}
