/** What the sign-in card is currently telling the user. Each kind maps to one design state. */
export type LoginFormStatus =
  | { kind: "idle" }
  | { kind: "invalid-credentials" }
  | { kind: "email-not-verified"; email: string }
  | { kind: "rate-limited" }
  | { kind: "oauth-failed" }
  | { kind: "error"; message: string };
