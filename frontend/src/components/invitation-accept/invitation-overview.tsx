import { InvitationDetails } from "@/components/invitation-accept/invitation-details";
import { InvitationHeader } from "@/components/invitation-accept/invitation-header";
import type { InvitationPreview } from "@/types/shared";

type InvitationOverviewProps = {
  preview: InvitationPreview;
};

/** Everything the invitee needs to decide: the headline and the detail panel. Actions follow it. */
export function InvitationOverview({ preview }: InvitationOverviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <InvitationHeader preview={preview} />
      <InvitationDetails preview={preview} />
    </div>
  );
}
