import type { Workspace } from "./workspace.type";
import type { WorkspaceAccess } from "./workspace-access.type";

/**
 * Where the workspace in the URL stands. The provider shares it with the page so that the page can
 * always be rendered, and the shell decides what to show for each state.
 */
export type WorkspaceState =
  | { status: "loading" }
  /** Does not exist, or the caller is not a member. The gateway answers both the same way. */
  | { status: "missing" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; workspace: Workspace; access: WorkspaceAccess };
