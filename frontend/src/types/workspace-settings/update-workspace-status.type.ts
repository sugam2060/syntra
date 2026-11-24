/** What the last attempt to save the workspace profile ended with. */
export type UpdateWorkspaceStatus =
  | { kind: "idle" }
  /** 409: another workspace already uses the URL. */
  | { kind: "slug-taken" }
  /** 403: the caller's role may not change workspace settings. */
  | { kind: "forbidden" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
