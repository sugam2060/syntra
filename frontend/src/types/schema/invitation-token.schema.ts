import { z } from "zod";

// The gateway accepts invitation tokens of 20 to 200 characters (AcceptInvitationDto, PreviewInvitationQueryDto).
const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 200;

/** The `token` query parameter of the emailed invitation link. */
export const invitationTokenSchema = z
  .string()
  .min(TOKEN_MIN_LENGTH)
  .max(TOKEN_MAX_LENGTH);

export type InvitationToken = z.infer<typeof invitationTokenSchema>;
