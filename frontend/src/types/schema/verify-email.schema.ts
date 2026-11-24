import { z } from "zod";

// The gateway accepts tokens of 20 to 200 characters (VerifyEmailDto).
const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 200;

/** The `token` query parameter of the verification link. */
export const verifyEmailTokenSchema = z
  .string()
  .min(TOKEN_MIN_LENGTH)
  .max(TOKEN_MAX_LENGTH);

/** Body of `POST /authentication/verify-email`. */
export const verifyEmailSchema = z.object({
  token: verifyEmailTokenSchema,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
