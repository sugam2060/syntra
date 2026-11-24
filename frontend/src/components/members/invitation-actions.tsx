"use client";

import { LuLoaderCircle } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import type { WorkspaceInvitation } from "@/types/shared";

type InvitationActionsProps = {
  invitation: WorkspaceInvitation;
  resending: boolean;
  onResend: (invitation: WorkspaceInvitation) => void;
  onRevoke: (invitation: WorkspaceInvitation) => void;
};

/** Ghost "Resend" and ghost danger "Revoke" for one invitation. */
export function InvitationActions({
  invitation,
  resending,
  onResend,
  onRevoke,
}: InvitationActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={resending}
        aria-label={`Resend invitation to ${invitation.email}`}
        onClick={() => onResend(invitation)}
      >
        {resending && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
        Resend
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Revoke invitation for ${invitation.email}`}
        onClick={() => onRevoke(invitation)}
      >
        Revoke
      </Button>
    </div>
  );
}
