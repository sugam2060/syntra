/** Reasons the gateway (or the session refresh) can send the user back to `/auth/callback` with. */
export const AUTH_CALLBACK_ERROR_CODE = {
  /** `?error=oauth_failed`: Google sign-in failed or the state check did not match. */
  oauthFailed: "oauth_failed",
  /** Any other `error` value. Never rendered, only mapped to a generic message. */
  unknown: "unknown",
  /** Google sign-in worked but the access token could not be obtained. */
  sessionFailed: "session_failed",
  /** The gateway could not be reached while finishing sign-in. */
  network: "network",
} as const;

export type AuthCallbackErrorCode =
  (typeof AUTH_CALLBACK_ERROR_CODE)[keyof typeof AUTH_CALLBACK_ERROR_CODE];
