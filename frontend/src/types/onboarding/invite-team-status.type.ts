/** Outcome of the last send-invites attempt that the form needs to show. */
export type InviteTeamStatus =
  | { kind: "idle" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
