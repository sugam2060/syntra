/** Why the invitation could not be loaded at all (not why it is closed). */
export const INVITATION_LOAD_PROBLEM = {
  /** The gateway answered 429 on the public preview route. */
  rateLimited: "rate-limited",
  /** The server was unreachable or failed. Retrying may work. */
  unreachable: "unreachable",
} as const;

export type InvitationLoadProblem =
  (typeof INVITATION_LOAD_PROBLEM)[keyof typeof INVITATION_LOAD_PROBLEM];
