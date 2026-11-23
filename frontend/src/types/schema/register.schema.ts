import { z } from "zod";

import {
  emailSchema,
  NAME_MAX_LENGTH,
  newPasswordSchema,
} from "./auth-fields.schema";

/** Create-account form. The gateway treats `name` as optional, but the product requires it. */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters.`),
  email: emailSchema,
  password: newPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
