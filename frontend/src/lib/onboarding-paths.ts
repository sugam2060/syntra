/** Routes of the onboarding flow. */
export const ONBOARDING_PATH = {
  start: "/onboarding",
  workspace: "/onboarding/workspace",
  invite: "/onboarding/invite",
} as const;

/** The invite step for a workspace that was just created. */
export function invitePath(workspaceSlug: string): string {
  return `${ONBOARDING_PATH.invite}?workspace=${encodeURIComponent(workspaceSlug)}`;
}

/** A workspace's home. Workspace screens are addressed by slug and resolved to an id through the API. */
export function workspaceHomePath(workspaceSlug: string): string {
  return `/w/${encodeURIComponent(workspaceSlug)}`;
}

/** Shown in front of the slug field. Display only: the real URL depends on where the app is deployed. */
export const WORKSPACE_URL_PREFIX = "syntra.app/w/";
