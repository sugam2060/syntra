/** Outcome of the last "Change password" attempt, for errors the gateway reports. */
export type ChangePasswordStatus =
  | { kind: "idle" }
  /** 403: the current password was wrong. */
  | { kind: "wrong-current" }
  /** 400 on a password change: the new password equals the current one. */
  | { kind: "unchanged" }
  /** 429: the strict throttle on this endpoint was hit. */
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
