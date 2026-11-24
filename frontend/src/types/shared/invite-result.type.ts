import type { z } from "zod";

import type { inviteResultSchema } from "@/api/workspaces";

export type InviteResult = z.infer<typeof inviteResultSchema>;
