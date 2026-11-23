/** What the create-account card is currently telling the user. Each kind maps to one design state. */
export type RegisterFormStatus =
  | { kind: "idle" }
  | { kind: "email-taken" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
