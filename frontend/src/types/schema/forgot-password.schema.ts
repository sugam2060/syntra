import { z } from "zod";

import { emailSchema } from "./auth-fields.schema";

/** Forgot-password dialog. Body of `POST /authentication/forgot-password`. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
