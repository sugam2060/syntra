import type { z } from "zod";

import type { workspaceRoleSchema } from "@/api/workspaces";

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
