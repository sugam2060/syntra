import type { z } from "zod";

import type { acceptedInvitationSchema } from "@/api/workspaces";

export type AcceptedInvitation = z.infer<typeof acceptedInvitationSchema>;
