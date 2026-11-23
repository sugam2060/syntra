import { z } from "zod";

import { newPasswordSchema } from "./auth-fields.schema";

// The gateway accepts tokens of 20 to 200 characters (ResetPasswordDto).
const TOKEN_MIN_LENGTH = 20;
const TOKEN_MAX_LENGTH = 200;

/** The `token` query parameter of the reset link. */
export const resetTokenSchema = z
  .string()
  .min(TOKEN_MIN_LENGTH)
  .max(TOKEN_MAX_LENGTH);

/** Reset-password form. `confirmPassword` is checked here only: the gateway rejects unknown fields. */
export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Body of `POST /authentication/reset-password`: the link token plus the new password. */
export const resetPasswordRequestSchema = z.object({
  token: resetTokenSchema,
  password: newPasswordSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
