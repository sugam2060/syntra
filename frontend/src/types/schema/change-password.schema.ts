import { z } from "zod";

import { newPasswordSchema, PASSWORD_MAX_LENGTH } from "./auth-fields.schema";

/**
 * Change-password form. An account that already has a password must give the current one; an
 * OAuth-only account is adding its first password, so that field is not asked for and may be empty.
 * `confirmPassword` is checked here only: the gateway rejects unknown fields.
 */
export function createChangePasswordSchema(hasPassword: boolean) {
  return z
    .object({
      currentPassword: hasPassword
        ? z
            .string()
            .min(1, "Enter your current password.")
            .max(
              PASSWORD_MAX_LENGTH,
              `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
            )
        : z.string(),
      newPassword: newPasswordSchema,
      confirmPassword: z.string().min(1, "Confirm your new password."),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords don't match.",
    })
    .refine(
      (value) => !hasPassword || value.newPassword !== value.currentPassword,
      {
        path: ["newPassword"],
        message: "New password must be different from the current one.",
      },
    );
}

export type ChangePasswordInput = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;

/** Body of `POST /authentication/change-password`. `currentPassword` is omitted when adding a first password. */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
  newPassword: newPasswordSchema,
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
