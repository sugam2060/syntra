import { z } from "zod";

import {
  emailSchema,
  PASSWORD_MAX_LENGTH,
} from "./auth-fields.schema";

/** Sign-in form. The password has no minimum because the gateway only rejects empty and over-long values on login. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(
      PASSWORD_MAX_LENGTH,
      `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
