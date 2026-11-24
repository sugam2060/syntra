import type { z } from "zod";

import type { workspaceSchema } from "@/api/workspaces";

export type Workspace = z.infer<typeof workspaceSchema>;
