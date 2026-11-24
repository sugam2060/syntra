import type { InvitationPreview } from "@/types/shared";

/** The preview statuses that end the flow: the invitation can no longer be accepted. */
export type InvitationClosedStatus = Exclude<InvitationPreview["status"], "pending">;
