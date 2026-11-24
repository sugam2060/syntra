"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useResendInvitation, useWorkspaceInvitations } from "@/api/workspaces";
import { InvitationCards } from "@/components/members/invitation-cards";
import { InvitationsEmpty } from "@/components/members/invitations-empty";
import { InvitationsTable } from "@/components/members/invitations-table";
import { ListSkeleton } from "@/components/members/list-skeleton";
import { QueryError } from "@/components/members/query-error";
import { RevokeInvitationDialog } from "@/components/members/revoke-invitation-dialog";
import { getErrorMessage } from "@/lib/error-message";
import { useWorkspace } from "@/providers/workspace-provider";
import type { WorkspaceInvitation } from "@/types/shared";

type InvitationsTabProps = {
  onInvite: () => void;
};

/** Open invitations with resend and revoke. Only people who manage members see this tab. */
export function InvitationsTab({ onInvite }: InvitationsTabProps) {
  const { workspace } = useWorkspace();
  const invitations = useWorkspaceInvitations(workspace.id);
  const resend = useResendInvitation(workspace.id);
  // Read once on mount so rendering stays pure; the list refetches when something changes.
  const [now] = useState(() => Date.now());
  const [revoking, setRevoking] = useState<WorkspaceInvitation | null>(null);

  function handleResend(invitation: WorkspaceInvitation): void {
    resend.mutate(invitation.id, {
      onSuccess: () => toast.success(`Invitation sent again to ${invitation.email}`),
      onError: (error) =>
        toast.error(getErrorMessage(error, "Couldn't resend the invitation. Try again.")),
    });
  }

  if (invitations.isPending) {
    return <ListSkeleton label="invitations" rows={3} />;
  }
  if (invitations.isError) {
    return (
      <QueryError
        subject="invitations"
        error={invitations.error}
        onRetry={() => void invitations.refetch()}
      />
    );
  }
  if (invitations.data.length === 0) {
    return <InvitationsEmpty onInvite={onInvite} />;
  }

  const resendingId = resend.isPending ? (resend.variables ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <InvitationsTable
        invitations={invitations.data}
        now={now}
        resendingId={resendingId}
        onResend={handleResend}
        onRevoke={setRevoking}
      />
      <InvitationCards
        invitations={invitations.data}
        now={now}
        resendingId={resendingId}
        onResend={handleResend}
        onRevoke={setRevoking}
      />
      <p className="text-xs leading-[18px] text-muted-foreground">
        Invitations expire after 7 days. Resending creates a new link and cancels the old one.
      </p>
      <RevokeInvitationDialog
        workspaceId={workspace.id}
        invitation={revoking}
        onClose={() => setRevoking(null)}
      />
    </div>
  );
}
