import type { Workspace } from "./workspace.type";
import type { WorkspaceAccess } from "./workspace-access.type";

/** What `useWorkspace()` returns: the workspace in the URL and what the caller may do in it. */
export type WorkspaceContextValue = {
  workspace: Workspace;
  access: WorkspaceAccess;
};
