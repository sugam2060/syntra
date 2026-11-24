/** A verification attempt that failed for a reason other than a refused token, so the token may still work. */
export type VerifyEmailFailure =
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
