"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useRemoveMember } from "@/api/workspaces";
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
import type { WorkspaceMember } from "@/types/shared";

type RemoveMemberDialogProps = {
  workspaceId: string;
  workspaceName: string;
  /** The member to remove; null keeps the dialog closed. */
  member: WorkspaceMember | null;
  onClose: () => void;
};

/** Confirmation before taking someone out of the workspace. The gateway's message is shown if it refuses. */
export function RemoveMemberDialog({
  workspaceId,
  workspaceName,
  member,
  onClose,
}: RemoveMemberDialogProps) {
  const remove = useRemoveMember(workspaceId);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean): void {
    if (!open && !remove.isPending) {
      setError(null);
      onClose();
    }
  }

  function handleRemove(): void {
    if (!member) {
      return;
    }
    const displayName = member.name ?? member.email;
    setError(null);
    remove.mutate(member.userId, {
      onSuccess: () => {
        toast.success(`${displayName} was removed from ${workspaceName}`);
        onClose();
      },
      onError: (failure) => {
        const message = getErrorMessage(failure, "Couldn't remove this person. Try again.");
        setError(message);
        toast.error(message);
      },
    });
  }

  return (
    <AlertDialog open={member !== null} onOpenChange={handleOpenChange}>
      {member && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {member.name ?? member.email} from {workspaceName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this workspace immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs leading-[18px] text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={remove.isPending} onClick={handleRemove}>
              {remove.isPending ? "Removing" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
