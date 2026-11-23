import { z } from "zod";

// Limits mirror the gateway DTOs (src/authentication/dto).
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

/** Shared email field. The gateway trims and lowercases emails, so the form trims too. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters.`)
  .pipe(z.email("Enter a valid email address."));

/** A password being chosen (create account, reset password). Sign-in uses a looser rule on purpose. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  );
