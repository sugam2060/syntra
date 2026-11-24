import type { InviteRoleOption } from "@/types/onboarding";

/** Roles offered while inviting. Their ids come from `GET /workspaces/:workspaceId/roles`, matched by key. */
export const INVITE_ROLE_OPTIONS: ReadonlyArray<InviteRoleOption> = [
  {
    key: "admin",
    label: "Admin",
    description: "Manage workspace settings, members, and API keys.",
  },
  {
    key: "member",
    label: "Member",
    description: "Create and edit projects, tasks, and use AI tools.",
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Read-only access to boards, lists, and status reports.",
  },
];

export const DEFAULT_INVITE_ROLE = "member" as const;
