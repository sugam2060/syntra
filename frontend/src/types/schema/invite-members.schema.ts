import { z } from "zod";

import { emailSchema } from "./auth-fields.schema";

/** Most addresses the gateway accepts in one invite request. */
export const INVITE_MAX_EMAILS = 20;

/** Roles that can be offered during onboarding. The owner role can never be offered. */
export const inviteRoleSchema = z.enum(["admin", "member", "viewer"]);

/** Form values of the invite step: the people to invite and the role they get. */
export const inviteMembersSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1, "Add at least one email address.")
    .max(INVITE_MAX_EMAILS, `Invite up to ${INVITE_MAX_EMAILS} people at a time.`),
  role: inviteRoleSchema,
});

export type InviteMembersInput = z.infer<typeof inviteMembersSchema>;

/** Body of `POST /workspaces/:workspaceId/invitations`: the role is sent by id. */
export const inviteMembersRequestSchema = z.object({
  emails: z.array(emailSchema).min(1).max(INVITE_MAX_EMAILS),
  roleId: z.uuid(),
  /** Optional personal note included in the email (at most 500 characters). */
  message: z.string().max(500).optional(),
});

export type InviteMembersRequest = z.infer<typeof inviteMembersRequestSchema>;
