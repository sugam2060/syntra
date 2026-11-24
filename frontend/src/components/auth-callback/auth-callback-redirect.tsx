"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthCallbackSigningIn } from "@/components/auth-callback/auth-callback-signing-in";

type AuthCallbackRedirectProps = {
  /** An internal path chosen by `resolveAuthCallbackOutcome`, never a value taken from the URL. */
  path: string;
};

/** Hands a signed-in user over to the page that shows the result, under the same loading ring. */
export function AuthCallbackRedirect({ path }: AuthCallbackRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(path);
  }, [path, router]);

  return (
    <AuthCallbackSigningIn
      title="Finishing up…"
      description="Taking you back to your account"
    />
  );
}
