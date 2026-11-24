/** Who a key acts for, as the table shows them. */
export type KeyCreator =
  | { kind: "loading" }
  | { kind: "member"; name: string; email: string; avatarUrl: string | null }
  | { kind: "unknown" };
