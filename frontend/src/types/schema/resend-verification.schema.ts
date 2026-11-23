import { z } from "zod";

import { emailSchema } from "./auth-fields.schema";

/** Body of `POST /authentication/resend-verification`. */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
