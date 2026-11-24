import { z } from "zod";

/** Longest role name the gateway accepts. */
export const ROLE_NAME_MAX_LENGTH = 60;

/** Form values and request body of creating or editing a custom role. The role key is derived by the gateway and never changes. */
export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a role name.")
    .max(ROLE_NAME_MAX_LENGTH, `Use ${ROLE_NAME_MAX_LENGTH} characters or fewer.`),
  permissions: z.array(z.string()),
});

export type RoleInput = z.infer<typeof roleSchema>;
