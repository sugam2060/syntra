/** Why the verification link cannot be used. Both reasons end in the "send a new link" form. */
export const VERIFY_EMAIL_PROBLEM = {
  /** The link carries no usable token, so no request was made. */
  missing: "missing",
  /** The gateway refused the token: invalid, expired or already used. */
  expired: "expired",
} as const;

export type VerifyEmailProblem =
  (typeof VERIFY_EMAIL_PROBLEM)[keyof typeof VERIFY_EMAIL_PROBLEM];
