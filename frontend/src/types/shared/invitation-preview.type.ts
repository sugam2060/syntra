import type { z } from "zod";

import type { invitationPreviewSchema } from "@/api/workspaces";

export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;
