import {
  ACCOUNT_LINK_PATH,
  LINK_ERROR_VALUE,
} from "@/lib/account-link-result";
import { ApiError } from "@/lib/api-error";
import {
  AUTH_CALLBACK_ERROR_CODE,
  type AuthCallbackErrorCode,
  type AuthCallbackMessage,
  type AuthCallbackOutcome,
  type AuthCallbackSearchParams,
} from "@/types/auth-callback";

/**
 * Where a completed Google sign-in lands: the same place as a password login. `/` is the entry route
 * that sends the user to their workspace, or to onboarding when they have none.
 */
export const POST_SIGN_IN_PATH = "/";

const LINKED_PROVIDER_GOOGLE = "google";
const NETWORK_ERROR_API_CODE = "NETWORK_ERROR";

/**
 * Fixed copy for every error state of `/auth/callback`. Only these strings are rendered, never
 * the `error` value from the URL.
 */
export const AUTH_CALLBACK_MESSAGES: Record<
  AuthCallbackErrorCode,
  AuthCallbackMessage
> = {
  [AUTH_CALLBACK_ERROR_CODE.oauthFailed]: {
    title: "Google sign-in didn't complete",
    description:
      "Something went wrong while signing you in with Google. Go back to sign in and try again.",
  },
  [AUTH_CALLBACK_ERROR_CODE.unknown]: {
    title: "Something went wrong",
    description:
      "We couldn't finish that request. Go back to sign in and try again.",
  },
  [AUTH_CALLBACK_ERROR_CODE.sessionFailed]: {
    title: "Couldn't finish signing you in",
    description:
      "Your Google sign-in worked, but we couldn't start your session. Go back to sign in and try again.",
  },
  [AUTH_CALLBACK_ERROR_CODE.network]: {
    title: "Couldn't finish signing you in",
    description:
      "We can't reach the server. Check your connection, then go back to sign in and try again.",
  },
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function errorCodeFrom(value: string | string[] | undefined): AuthCallbackErrorCode {
  if (value === AUTH_CALLBACK_ERROR_CODE.oauthFailed) {
    return AUTH_CALLBACK_ERROR_CODE.oauthFailed;
  }
  // Unknown, repeated or empty values all get the generic message. The raw value is never shown.
  return AUTH_CALLBACK_ERROR_CODE.unknown;
}

/**
 * Maps the callback query string to what the page must do. `error` wins over `linked`; no known
 * parameter means a plain Google sign-in whose session still has to be completed. The two results of an
 * account-link flow (`linked=google`, `error=oauth_link_failed`) concern a user who is already signed
 * in, so they leave for the account page, which shows the result. `error=oauth_failed` stays here: it
 * also happens during a normal sign-in.
 */
export function resolveAuthCallbackOutcome(
  params: AuthCallbackSearchParams,
): AuthCallbackOutcome {
  if (params.error !== undefined) {
    if (firstValue(params.error) === LINK_ERROR_VALUE.linkFailed) {
      return { kind: "redirect", path: ACCOUNT_LINK_PATH.linkFailed };
    }
    return { kind: "error", code: errorCodeFrom(params.error) };
  }
  if (firstValue(params.linked) === LINKED_PROVIDER_GOOGLE) {
    return { kind: "redirect", path: ACCOUNT_LINK_PATH.linked };
  }
  return { kind: "sign-in" };
}

/** Picks the copy for a failed session refresh: unreachable server versus a rejected session. */
export function messageForSignInFailure(error: unknown): AuthCallbackMessage {
  const isNetworkError =
    error instanceof ApiError && error.code === NETWORK_ERROR_API_CODE;
  return AUTH_CALLBACK_MESSAGES[
    isNetworkError
      ? AUTH_CALLBACK_ERROR_CODE.network
      : AUTH_CALLBACK_ERROR_CODE.sessionFailed
  ];
}
