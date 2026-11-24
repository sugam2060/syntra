/**
 * The workspace a user just joined. `slug` is null when the workspace could not be read right after
 * joining, so callers fall back to the app's front door (`/`).
 */
export type JoinedWorkspace = {
  workspaceId: string;
  slug: string | null;
};
