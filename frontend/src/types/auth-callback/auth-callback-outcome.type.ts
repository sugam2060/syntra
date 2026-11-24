import type { AuthCallbackErrorCode } from "./auth-callback-error-code.type";

/** What the callback URL is asking this page to do. */
export type AuthCallbackOutcome =
  | { kind: "sign-in" }
  /** The user is already signed in (an account-link result): hand over to `path` without rendering anything from the URL. */
  | { kind: "redirect"; path: string }
  | { kind: "error"; code: AuthCallbackErrorCode };
