import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCallbackContent } from "@/components/auth-callback/auth-callback-content";
import { AuthCallbackShell } from "@/components/auth-callback/auth-callback-shell";
import { AuthCallbackSigningIn } from "@/components/auth-callback/auth-callback-signing-in";

export const metadata: Metadata = {
  title: "Completing sign-in — Syntra",
  // A transient redirect target: nothing here is worth indexing or following.
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage({
  searchParams,
}: PageProps<"/auth/callback">) {
  return (
    <AuthCallbackShell>
      <Suspense fallback={<AuthCallbackSigningIn />}>
        <AuthCallbackContent searchParams={searchParams} />
      </Suspense>
    </AuthCallbackShell>
  );
}
