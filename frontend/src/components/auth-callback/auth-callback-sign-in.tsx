"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useCompleteOAuthSignIn } from "@/api/auth";
import { AuthCallbackError } from "@/components/auth-callback/auth-callback-error";
import { AuthCallbackSigningIn } from "@/components/auth-callback/auth-callback-signing-in";
import { messageForSignInFailure, POST_SIGN_IN_PATH } from "@/lib/auth-callback";

const SIGN_IN_FAILED_TOAST_ID = "google-sign-in-failed";

/** Trades the refresh cookie the gateway just set for an access token, then enters the app like a password login. */
export function AuthCallbackSignIn() {
  const router = useRouter();
  const session = useCompleteOAuthSignIn();

  useEffect(() => {
    if (session.isSuccess) {
      router.replace(POST_SIGN_IN_PATH);
    }
  }, [session.isSuccess, router]);

  useEffect(() => {
    if (session.isError) {
      toast.error("Google sign-in failed", { id: SIGN_IN_FAILED_TOAST_ID });
    }
  }, [session.isError]);

  if (session.isError) {
    return <AuthCallbackError message={messageForSignInFailure(session.error)} />;
  }
  return <AuthCallbackSigningIn />;
}
