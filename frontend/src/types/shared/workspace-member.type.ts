import type { z } from "zod";

import type { workspaceMemberSchema } from "@/api/workspaces";

export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
