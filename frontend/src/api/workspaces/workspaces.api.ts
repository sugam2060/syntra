import { z } from "zod";

import { apiRequest, apiRequestVoid } from "@/lib/api-client";
import type {
  ChangeMemberRoleRequest,
  CreateWorkspaceInput,
  InviteMembersRequest,
  ReplacePermissionOverridesRequest,
  RoleInput,
  UpdateWorkspaceInput,
} from "@/types/schema";
import type {
  AcceptedInvitation,
  InvitationPreview,
  InviteResult,
  MyInvitation,
  PermissionInfo,
  PermissionOverride,
  SlugAvailability,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/shared";

import {
  acceptedInvitationSchema,
  invitationPreviewSchema,
  inviteResultSchema,
  myInvitationSchema,
  permissionInfoSchema,
  permissionOverrideSchema,
  slugAvailabilitySchema,
  workspaceInvitationSchema,
  workspaceMemberSchema,
  workspaceRoleSchema,
  workspaceSchema,
} from "./workspaces.schemas";

/**
 * Asks whether a slug can be used. A bad format is reported in the answer (`reason: "invalid"`),
 * never as a 400. Strictly rate limited, so debounce callers.
 */
export function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  return apiRequest(
    `/workspaces/slug-availability?slug=${encodeURIComponent(slug)}`,
    { schema: slugAvailabilitySchema },
  );
}

/** Creates a workspace owned by the caller. 409 when the slug is taken, 400 when it is reserved. */
export function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  return apiRequest("/workspaces", {
    method: "POST",
    body: { name: input.name.trim(), slug: input.slug.trim() },
    schema: workspaceSchema,
  });
}

/** Workspaces the caller belongs to, each with the caller's role. Empty means the user has not onboarded yet. */
export function listMyWorkspaces(): Promise<Workspace[]> {
  return apiRequest("/workspaces", { schema: z.array(workspaceSchema) });
}

/** Turns a `/w/:slug` URL into the workspace the rest of the API addresses by id. 404 for non-members. */
export function getWorkspaceBySlug(slug: string): Promise<Workspace> {
  return apiRequest(`/workspaces/by-slug/${encodeURIComponent(slug)}`, {
    schema: workspaceSchema,
  });
}

/** Built-in roles plus the workspace's custom roles. */
export function listWorkspaceRoles(workspaceId: string): Promise<WorkspaceRole[]> {
  return apiRequest(`/workspaces/${workspaceId}/roles`, {
    schema: z.array(workspaceRoleSchema),
  });
}

/** One result per address: `invited`, `already_member` or `already_invited`. */
export function inviteMembers(
  workspaceId: string,
  input: InviteMembersRequest,
): Promise<InviteResult[]> {
  return apiRequest(`/workspaces/${workspaceId}/invitations`, {
    method: "POST",
    body: input,
    schema: z.array(inviteResultSchema),
  });
}

/** Live invitations addressed to the signed-in user's verified email. */
export function listMyInvitations(): Promise<MyInvitation[]> {
  return apiRequest("/invitations/mine", { schema: z.array(myInvitationSchema) });
}

/**
 * Accepts an invitation from the in-app list. 400 when it is no longer valid (one generic message),
 * 403 with `EMAIL_NOT_VERIFIED` when the caller's email is not verified.
 */
export function acceptInvitation(invitationId: string): Promise<AcceptedInvitation> {
  return apiRequest("/invitations/accept", {
    method: "POST",
    body: { invitationId },
    schema: acceptedInvitationSchema,
  });
}

/**
 * What the accept page shows for an emailed token. Public, so `auth: false` keeps a signed-out visitor
 * from being sent to `/login`. Strictly rate limited (429); 404 for an unknown token.
 */
export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiRequest(`/invitations/preview?token=${encodeURIComponent(token)}`, {
    schema: invitationPreviewSchema,
    auth: false,
  });
}

/**
 * Accepts by the emailed token. Needs a signed-in user. Every refusal (unknown, expired, revoked, used,
 * or addressed to another email) is one generic 400; 403 with `EMAIL_NOT_VERIFIED` when the caller's
 * email is not verified. Already being a member is not an error.
 */
export function acceptInvitationByToken(token: string): Promise<AcceptedInvitation> {
  return apiRequest("/invitations/accept", {
    method: "POST",
    body: { token },
    schema: acceptedInvitationSchema,
  });
}

/** A workspace the caller belongs to, by id. 404 for non-members. */
export function getWorkspaceById(workspaceId: string): Promise<Workspace> {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}`, {
    schema: workspaceSchema,
  });
}

/** 204. 404 when the invitation is not addressed to the caller or is already closed. */
export function declineInvitation(invitationId: string): Promise<void> {
  return apiRequestVoid(`/invitations/${invitationId}/decline`, {
    method: "POST",
  });
}

/** Every permission a role or override can contain, for building editors. Needs `workspace:read`. */
export function listWorkspacePermissions(workspaceId: string): Promise<PermissionInfo[]> {
  return apiRequest(`/workspaces/${workspaceId}/permissions`, {
    schema: z.array(permissionInfoSchema),
  });
}

/** Members of a workspace, each with their role. Needs `workspace:read`. */
export function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return apiRequest(`/workspaces/${workspaceId}/members`, {
    schema: z.array(workspaceMemberSchema),
  });
}

/**
 * Gives a member another role. 403 for the owner role, the owner as target, the caller themselves,
 * or a role holding a permission the caller lacks; 404 for an unknown role or member.
 */
export function changeMemberRole(
  workspaceId: string,
  userId: string,
  input: ChangeMemberRoleRequest,
): Promise<WorkspaceMember> {
  return apiRequest(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: input,
    schema: workspaceMemberSchema,
  });
}

/** 204. 403 when the target is the owner. */
export function removeMember(workspaceId: string, userId: string): Promise<void> {
  return apiRequestVoid(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}

/** The allow and deny exceptions of one member. Needs `member:update_role`. */
export function getMemberPermissionOverrides(
  workspaceId: string,
  userId: string,
): Promise<PermissionOverride[]> {
  return apiRequest(`/workspaces/${workspaceId}/members/${userId}/permission-overrides`, {
    schema: z.array(permissionOverrideSchema),
  });
}

/**
 * Replaces the whole set of overrides; `[]` clears it. 403 when the set would grant a permission the
 * caller lacks (lifting a `deny` counts as granting), or for the owner or the caller themselves.
 */
export function replaceMemberPermissionOverrides(
  workspaceId: string,
  userId: string,
  input: ReplacePermissionOverridesRequest,
): Promise<PermissionOverride[]> {
  return apiRequest(`/workspaces/${workspaceId}/members/${userId}/permission-overrides`, {
    method: "PUT",
    body: input,
    schema: z.array(permissionOverrideSchema),
  });
}

/** Creates a custom role. 409 for a duplicate or built-in name, 403 when the caller lacks a permission it grants. */
export function createRole(workspaceId: string, input: RoleInput): Promise<WorkspaceRole> {
  return apiRequest(`/workspaces/${workspaceId}/roles`, {
    method: "POST",
    body: input,
    schema: workspaceRoleSchema,
  });
}

/** Renames a custom role and replaces its permissions. The key never changes. 403 for built-in roles. */
export function updateRole(
  workspaceId: string,
  roleId: string,
  input: RoleInput,
): Promise<WorkspaceRole> {
  return apiRequest(`/workspaces/${workspaceId}/roles/${roleId}`, {
    method: "PATCH",
    body: input,
    schema: workspaceRoleSchema,
  });
}

/** 204. 409 while a member or invitation still uses the role, 403 for built-in roles. */
export function deleteRole(workspaceId: string, roleId: string): Promise<void> {
  return apiRequestVoid(`/workspaces/${workspaceId}/roles/${roleId}`, {
    method: "DELETE",
  });
}

/** Open invitations of the workspace, expired ones included. Needs `member:invite`. */
export function listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  return apiRequest(`/workspaces/${workspaceId}/invitations`, {
    schema: z.array(workspaceInvitationSchema),
  });
}

/** Issues a new link and expiry; the link emailed earlier stops working. */
export function resendInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<WorkspaceInvitation> {
  return apiRequest(`/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {
    method: "POST",
    schema: workspaceInvitationSchema,
  });
}

/** 204. The emailed link stops working. */
export function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  return apiRequestVoid(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

/**
 * Renames the workspace and/or changes its URL; send only the fields that changed. Answers with the
 * updated workspace. 409 when the slug is taken, 400 when it is reserved, 403 without `workspace:update`.
 */
export function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "PATCH",
    body: input,
    schema: workspaceSchema,
  });
}

/** 204. Deletes the workspace and everything in it. 403 unless the caller holds `workspace:delete` (the owner). */
export function deleteWorkspace(workspaceId: string): Promise<void> {
  return apiRequestVoid(`/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
}

/** 204. Removes the caller from the workspace. 403 for the owner, who cannot leave. */
export function leaveWorkspace(workspaceId: string): Promise<void> {
  return apiRequestVoid(`/workspaces/${encodeURIComponent(workspaceId)}/members/me`, {
    method: "DELETE",
  });
}
