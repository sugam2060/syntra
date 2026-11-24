import { z } from "zod";

/** A workspace with the caller's own role in it. Dates arrive as ISO strings. */
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: z.object({ key: z.string(), name: z.string() }),
});

/** Answer of `GET /workspaces/slug-availability`. `reason` is null when the slug is free. */
export const slugAvailabilitySchema = z.object({
  slug: z.string(),
  available: z.boolean(),
  reason: z.enum(["invalid", "reserved", "taken"]).nullable(),
});

/** A role usable in a workspace: a system role (shared) or a custom role of that workspace. */
export const workspaceRoleSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
});

/** A live invitation addressed to the signed-in user. */
export const myInvitationSchema = z.object({
  id: z.string(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  roleName: z.string(),
  inviterName: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

/** One result per address of a bulk invite. */
export const inviteResultSchema = z.object({
  email: z.string(),
  outcome: z.enum(["invited", "already_member", "already_invited"]),
});

export const acceptedInvitationSchema = z.object({ workspaceId: z.string() });

/**
 * Answer of the public `GET /invitations/preview`: what the accept page shows for an emailed token.
 * It carries no ids on purpose, so a token-only page can accept but never decline.
 */
export const invitationPreviewSchema = z.object({
  workspaceName: z.string(),
  roleName: z.string(),
  inviterName: z.string().nullable(),
  invitedEmail: z.string(),
  status: z.enum(["pending", "expired", "revoked", "accepted"]),
  expiresAt: z.string(),
});

/** One entry of the permission catalogue (`GET /workspaces/:workspaceId/permissions`), such as `task:assign`. */
export const permissionInfoSchema = z.object({
  key: z.string(),
  description: z.string(),
});

/** A workspace member as listed by the gateway. The owner is fixed: no role change, overrides or removal. */
export const workspaceMemberSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.object({ id: z.string(), key: z.string(), name: z.string() }),
  isOwner: z.boolean(),
  joinedAt: z.string(),
});

/** A per-member exception to the role: `allow` grants one permission, `deny` takes it away. */
export const permissionOverrideSchema = z.object({
  permissionKey: z.string(),
  effect: z.enum(["allow", "deny"]),
});

/** An open invitation as shown to people who manage members. Expired ones stay listed until resent or revoked. */
export const workspaceInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.object({ id: z.string(), key: z.string(), name: z.string() }),
  invitedBy: z.object({ id: z.string(), name: z.string().nullable() }),
  createdAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "expired"]),
});
