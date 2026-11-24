/** What the "send a new link" form is currently telling the user. */
export type ResendVerificationStatus =
  | { kind: "idle" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
