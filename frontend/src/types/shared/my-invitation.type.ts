import type { z } from "zod";

import type { myInvitationSchema } from "@/api/workspaces";

export type MyInvitation = z.infer<typeof myInvitationSchema>;
