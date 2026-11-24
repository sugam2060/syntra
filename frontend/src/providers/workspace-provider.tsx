"use client";

import { createContext, useContext, useMemo } from "react";

import { useWorkspaceBySlug } from "@/api/workspaces";
import { ApiError } from "@/lib/api-error";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import type { WorkspaceContextValue, WorkspaceState } from "@/types/shared";

const WorkspaceContext = createContext<WorkspaceState | null>(null);

type WorkspaceProviderProps = {
  /** The `[slug]` segment of the URL. */
  slug: string;
  children: React.ReactNode;
};

/** The gateway answers 404 for a workspace that does not exist and for one the caller is not a member of. */
function isMissingWorkspace(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

/**
 * Resolves the workspace in the URL and shares where it stands (loading, missing, failed, ready).
 *
 * It always renders its children, whatever the state. Holding them back while the workspace loads would
 * mean the page is never rendered, which Next's instant-navigation validation reports as a dropped
 * segment. The shell (`AppShell`) reads the state and shows the skeleton, the not-found screen or the
 * page, so everything inside the shell can rely on `useWorkspace()` returning a workspace.
 */
export function WorkspaceProvider({ slug, children }: WorkspaceProviderProps) {
  const query = useWorkspaceBySlug(slug);
  const { data: workspace, isPending, error, refetch } = query;

  const state = useMemo<WorkspaceState>(() => {
    if (workspace) {
      return { status: "ready", workspace, access: getWorkspaceAccess(workspace.role.key) };
    }
    if (isPending) {
      return { status: "loading" };
    }
    if (isMissingWorkspace(error)) {
      return { status: "missing" };
    }
    return { status: "error", retry: () => void refetch() };
  }, [workspace, isPending, error, refetch]);

  return <WorkspaceContext value={state}>{children}</WorkspaceContext>;
}

/** Where the workspace of the current `/w/[slug]` route stands. Read by the shell, which decides what to render. */
export function useWorkspaceState(): WorkspaceState {
  const state = useContext(WorkspaceContext);
  if (!state) {
    throw new Error("useWorkspaceState must be used inside a WorkspaceProvider (a /w/[slug] route)");
  }
  return state;
}

/**
 * The workspace of the current `/w/[slug]` route and what the caller may do in it.
 * `access` is a UI hint derived from the role; the gateway still enforces permissions.
 * Only call it below `AppShell`, which renders its children once the workspace is ready.
 */
export function useWorkspace(): WorkspaceContextValue {
  const state = useWorkspaceState();
  if (state.status !== "ready") {
    throw new Error("useWorkspace was called before the workspace was ready. Render it inside AppShell.");
  }
  return { workspace: state.workspace, access: state.access };
}
