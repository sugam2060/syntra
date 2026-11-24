import { z } from "zod";

import {
  workspaceNameSchema,
  workspaceSlugSchema,
} from "./create-workspace.schema";

/** Body of `PATCH /workspaces/:workspaceId`: same limits as create, and at least one field. */
export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema.optional(),
    slug: workspaceSlugSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "Change the name or the URL.",
  });

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
