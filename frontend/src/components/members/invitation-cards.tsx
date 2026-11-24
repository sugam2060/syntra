import { InvitationActions } from "@/components/members/invitation-actions";
import { InvitationExpiry, InvitationStatus } from "@/components/members/invitation-status";
import { RolePill } from "@/components/members/role-pill";
import { describeExpiry } from "@/lib/invitation-expiry";
import { describeElapsed } from "@/lib/relative-time";
import type { WorkspaceInvitation } from "@/types/shared";

type InvitationCardsProps = {
  invitations: readonly WorkspaceInvitation[];
  now: number;
  resendingId: string | null;
  onResend: (invitation: WorkspaceInvitation) => void;
  onRevoke: (invitation: WorkspaceInvitation) => void;
};

/** Mobile list of open invitations as stacked cards. From `md` the table takes over. */
export function InvitationCards({
  invitations,
  now,
  resendingId,
  onResend,
  onRevoke,
}: InvitationCardsProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {invitations.map((invitation) => {
        const expiry = describeExpiry(invitation.expiresAt, now);
        return (
          <li
            key={invitation.id}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate text-sm leading-5 font-medium text-foreground">
                {invitation.email}
              </span>
              <InvitationStatus status={invitation.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <RolePill name={invitation.role.name} />
              <span>
                Sent {describeElapsed(invitation.createdAt, now).toLowerCase()} by{" "}
                {invitation.invitedBy.name ?? "an unknown member"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {invitation.status === "pending" && "Expires"}
                <InvitationExpiry label={expiry.label} urgent={expiry.urgent} />
              </span>
              <InvitationActions
                invitation={invitation}
                resending={resendingId === invitation.id}
                onResend={onResend}
                onRevoke={onRevoke}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
