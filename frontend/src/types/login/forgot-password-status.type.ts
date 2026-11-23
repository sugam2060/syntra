/** What the forgot-password form is currently telling the user. */
export type ForgotPasswordStatus =
  | { kind: "idle" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
