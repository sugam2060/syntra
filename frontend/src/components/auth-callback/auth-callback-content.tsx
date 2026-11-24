import { AuthCallbackError } from "@/components/auth-callback/auth-callback-error";
import { AuthCallbackRedirect } from "@/components/auth-callback/auth-callback-redirect";
import { AuthCallbackSignIn } from "@/components/auth-callback/auth-callback-sign-in";
import {
  AUTH_CALLBACK_MESSAGES,
  resolveAuthCallbackOutcome,
} from "@/lib/auth-callback";
import type { AuthCallbackSearchParams } from "@/types/auth-callback";

type AuthCallbackContentProps = {
  searchParams: Promise<AuthCallbackSearchParams>;
};

/** Reads the callback query string on the server and picks the state to show. Render it inside Suspense. */
export async function AuthCallbackContent({
  searchParams,
}: AuthCallbackContentProps) {
  const outcome = resolveAuthCallbackOutcome(await searchParams);

  switch (outcome.kind) {
    case "error":
      return <AuthCallbackError message={AUTH_CALLBACK_MESSAGES[outcome.code]} />;
    case "redirect":
      return <AuthCallbackRedirect path={outcome.path} />;
    case "sign-in":
      return <AuthCallbackSignIn />;
  }
}
