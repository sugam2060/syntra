/** What the reset-password form is currently telling the user. */
export type ResetPasswordStatus =
  | { kind: "idle" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };

/** How the reset attempt ended. "rejected" means the gateway refused the token (invalid, expired or used). */
export type ResetPasswordOutcome = "pending" | "done" | "rejected";
