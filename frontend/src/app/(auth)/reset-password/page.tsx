import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordFlow } from "@/components/reset-password/reset-password-flow";
import { ResetPasswordSkeleton } from "@/components/reset-password/reset-password-skeleton";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Reset password — Syntra",
  // The URL carries a one-time token: never leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<ResetPasswordSkeleton />}>
        <ResetPasswordFlow />
      </Suspense>
    </AuthShell>
  );
}
