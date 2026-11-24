import { workspaceHomePath } from "@/lib/onboarding-paths";

/** Routes inside a workspace, addressed by slug. Build links with these instead of string concatenation. */
export const workspacePaths = {
  home: (slug: string): string => workspaceHomePath(slug),
  members: (slug: string): string => `${workspaceHomePath(slug)}/members`,
  settings: (slug: string): string => `${workspaceHomePath(slug)}/settings`,
  apiKeys: (slug: string): string => `${workspaceHomePath(slug)}/settings/api-keys`,
} as const;

/** Routes that belong to the signed-in user, not to a workspace. */
export const ACCOUNT_PATH = {
  security: "/account/security",
} as const;
