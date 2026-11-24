import { z } from "zod";

/** Body of `PATCH /workspaces/:workspaceId/members/:userId`. The owner role cannot be assigned. */
export const changeMemberRoleRequestSchema = z.object({
  roleId: z.uuid(),
});

export type ChangeMemberRoleRequest = z.infer<typeof changeMemberRoleRequestSchema>;
