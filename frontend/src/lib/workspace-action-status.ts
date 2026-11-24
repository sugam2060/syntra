import { ApiError } from "@/lib/api-error";
import type { WorkspaceActionStatus } from "@/types/workspace-settings";

/**
 * Maps a failed delete or leave request to what the dialog shows: 403 is its own state (the role
 * may not do this), anything else is a message. `fallbackMessage` replaces the gateway's text.
 */
export function workspaceActionStatusFromError(
  error: unknown,
  fallbackMessage?: string,
): WorkspaceActionStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  if (error.status === 403) {
    return { kind: "forbidden" };
  }
  return { kind: "error", message: fallbackMessage ?? error.message };
}
