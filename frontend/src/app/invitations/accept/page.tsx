import type { Metadata } from "next";
import { Suspense } from "react";

import { InvitationAcceptContent } from "@/components/invitation-accept/invitation-accept-content";
import { InvitationAcceptShell } from "@/components/invitation-accept/invitation-accept-shell";
import { InvitationAcceptSkeleton } from "@/components/invitation-accept/invitation-accept-skeleton";

export const metadata: Metadata = {
  title: "Accept invitation — Syntra",
  // The URL carries a secret invitation token: never leak it to other sites through the Referer header,
  // and keep the page out of search results.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function InvitationAcceptPage({
  searchParams,
}: PageProps<"/invitations/accept">) {
  return (
    <InvitationAcceptShell>
      <Suspense fallback={<InvitationAcceptSkeleton />}>
        <InvitationAcceptContent searchParams={searchParams} />
      </Suspense>
    </InvitationAcceptShell>
  );
}
