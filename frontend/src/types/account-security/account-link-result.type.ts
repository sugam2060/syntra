/** What the Google link flow reported through the query string of `/account/security`. */
export const ACCOUNT_LINK_RESULT = {
  /** `?linked=google`: the Google account is now linked. */
  linked: "linked",
  /** `?error=oauth_link_failed`: that Google account already belongs to another user. */
  alreadyLinked: "already_linked",
  /** `?error=oauth_failed`: the link did not complete. */
  failed: "failed",
} as const;

export type AccountLinkResult =
  (typeof ACCOUNT_LINK_RESULT)[keyof typeof ACCOUNT_LINK_RESULT];
