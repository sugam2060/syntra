import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/shared/auth-shell";
import { VerifyEmailToken } from "@/components/verify-email/verify-email-token";
import { VerifyEmailVerifying } from "@/components/verify-email/verify-email-verifying";

export const metadata: Metadata = {
  title: "Verify email — Syntra",
  // The URL carries a one-time token: never leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

export default function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  return (
    <AuthShell>
      <Suspense fallback={<VerifyEmailVerifying />}>
        <VerifyEmailToken searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
