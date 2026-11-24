/** Outcome of the last create-workspace attempt that the form needs to show. */
export type CreateWorkspaceStatus =
  | { kind: "idle" }
  | { kind: "slug-taken" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
