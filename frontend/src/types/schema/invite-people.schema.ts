import { z } from "zod";

import { emailSchema } from "./auth-fields.schema";
import { INVITE_MAX_EMAILS } from "./invite-members.schema";

/** Longest personal note the gateway accepts with an invitation. */
export const INVITE_MESSAGE_MAX_LENGTH = 500;

/** Form values of the invite dialog on the members page: who, which role (by id) and an optional note. */
export const invitePeopleSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1, "Add at least one email address.")
    .max(INVITE_MAX_EMAILS, `Invite up to ${INVITE_MAX_EMAILS} people at a time.`),
  roleId: z.uuid("Choose a role."),
  message: z
    .string()
    .max(INVITE_MESSAGE_MAX_LENGTH, `Use ${INVITE_MESSAGE_MAX_LENGTH} characters or fewer.`),
});

export type InvitePeopleInput = z.infer<typeof invitePeopleSchema>;
