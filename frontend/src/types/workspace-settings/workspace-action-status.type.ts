/** What the last attempt to delete or leave the workspace ended with. Success navigates away, so it has no state. */
export type WorkspaceActionStatus =
  | { kind: "idle" }
  /** 403: the caller's role may not do this. */
  | { kind: "forbidden" }
  | { kind: "error"; message: string };
