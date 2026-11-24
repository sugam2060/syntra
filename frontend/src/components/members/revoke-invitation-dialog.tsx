"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useRevokeInvitation } from "@/api/workspaces";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-message";
import type { WorkspaceInvitation } from "@/types/shared";

type RevokeInvitationDialogProps = {
  workspaceId: string;
  /** The invitation to revoke; null keeps the dialog closed. */
  invitation: WorkspaceInvitation | null;
  onClose: () => void;
};

/** Confirmation before an invitation link is cancelled. */
export function RevokeInvitationDialog({
  workspaceId,
  invitation,
  onClose,
}: RevokeInvitationDialogProps) {
  const revoke = useRevokeInvitation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean): void {
    if (!open && !revoke.isPending) {
      setError(null);
      onClose();
    }
  }

  function handleRevoke(): void {
    if (!invitation) {
      return;
    }
    setError(null);
    revoke.mutate(invitation.id, {
      onSuccess: () => {
        toast.success(`Invitation for ${invitation.email} revoked`);
        onClose();
      },
      onError: (failure) => {
        const message = getErrorMessage(failure, "Couldn't revoke the invitation. Try again.");
        setError(message);
        toast.error(message);
      },
    });
  }

  return (
    <AlertDialog open={invitation !== null} onOpenChange={handleOpenChange}>
      {invitation && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation for {invitation.email}?</AlertDialogTitle>
            <AlertDialogDescription>The link in their email stops working.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs leading-[18px] text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={revoke.isPending} onClick={handleRevoke}>
              {revoke.isPending ? "Revoking" : "Revoke"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
