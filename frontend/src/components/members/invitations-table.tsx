import { InvitationActions } from "@/components/members/invitation-actions";
import { InvitationExpiry, InvitationStatus } from "@/components/members/invitation-status";
import { PersonAvatar } from "@/components/members/person-avatar";
import { RolePill } from "@/components/members/role-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeExpiry } from "@/lib/invitation-expiry";
import { describeElapsed } from "@/lib/relative-time";
import type { WorkspaceInvitation } from "@/types/shared";

type InvitationsListProps = {
  invitations: readonly WorkspaceInvitation[];
  /** Current time in epoch milliseconds, so relative times stay pure while rendering. */
  now: number;
  resendingId: string | null;
  onResend: (invitation: WorkspaceInvitation) => void;
  onRevoke: (invitation: WorkspaceInvitation) => void;
};

const HEAD_CLASS = "h-10 px-4 text-xs text-muted-foreground";

/** Desktop list of open invitations. Below `md` the cards take over. */
export function InvitationsTable({
  invitations,
  now,
  resendingId,
  onResend,
  onRevoke,
}: InvitationsListProps) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-border md:block">
      <Table>
        <TableHeader className="bg-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD_CLASS}>Email</TableHead>
            <TableHead className={HEAD_CLASS}>Role</TableHead>
            <TableHead className={HEAD_CLASS}>Invited by</TableHead>
            <TableHead className={HEAD_CLASS}>Sent</TableHead>
            <TableHead className={HEAD_CLASS}>Expires</TableHead>
            <TableHead className={HEAD_CLASS}>Status</TableHead>
            <TableHead className="h-10 px-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const expiry = describeExpiry(invitation.expiresAt, now);
            return (
              <TableRow key={invitation.id} className="h-12">
                <TableCell className="max-w-[240px] truncate px-4 py-1 text-sm text-foreground">
                  {invitation.email}
                </TableCell>
                <TableCell className="px-4 py-1">
                  <RolePill name={invitation.role.name} />
                </TableCell>
                <TableCell className="px-4 py-1">
                  <span className="flex items-center gap-2">
                    <PersonAvatar name={invitation.invitedBy.name} size="sm" />
                    <span className="max-w-[140px] truncate text-sm text-foreground">
                      {invitation.invitedBy.name ?? "Unknown"}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="px-4 py-1 text-sm text-muted-foreground">
                  {describeElapsed(invitation.createdAt, now)}
                </TableCell>
                <TableCell className="px-4 py-1">
                  <InvitationExpiry label={expiry.label} urgent={expiry.urgent} />
                </TableCell>
                <TableCell className="px-4 py-1">
                  <InvitationStatus status={invitation.status} />
                </TableCell>
                <TableCell className="px-4 py-1 text-right">
                  <InvitationActions
                    invitation={invitation}
                    resending={resendingId === invitation.id}
                    onResend={onResend}
                    onRevoke={onRevoke}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
