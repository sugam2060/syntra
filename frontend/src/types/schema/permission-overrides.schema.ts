import { z } from "zod";

/** Body of `PUT /workspaces/:workspaceId/members/:userId/permission-overrides`: the complete set, `[]` clears it. */
export const replacePermissionOverridesRequestSchema = z.object({
  overrides: z.array(
    z.object({
      permissionKey: z.string().min(1),
      effect: z.enum(["allow", "deny"]),
    }),
  ),
});

export type ReplacePermissionOverridesRequest = z.infer<
  typeof replacePermissionOverridesRequestSchema
>;
