import type { z } from "zod";

import type { workspaceInvitationSchema } from "@/api/workspaces";

export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
