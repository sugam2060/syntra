"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDeleteRole } from "@/api/workspaces";
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
import type { WorkspaceRole } from "@/types/shared";

type DeleteRoleDialogProps = {
  workspaceId: string;
  /** The role to delete; null keeps the dialog closed. */
  role: WorkspaceRole | null;
  onClose: () => void;
};

/** Confirmation before deleting a custom role. A 409 ("in use") from the gateway is shown inside the dialog. */
export function DeleteRoleDialog({ workspaceId, role, onClose }: DeleteRoleDialogProps) {
  const remove = useDeleteRole(workspaceId);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean): void {
    if (!open && !remove.isPending) {
      setError(null);
      onClose();
    }
  }

  function handleDelete(): void {
    if (!role) {
      return;
    }
    setError(null);
    remove.mutate(role.id, {
      onSuccess: () => {
        toast.success(`${role.name} deleted`);
        onClose();
      },
      onError: (failure) => {
        const message = getErrorMessage(failure, "Couldn't delete the role. Try again.");
        setError(message);
        toast.error(message);
      },
    });
  }

  return (
    <AlertDialog open={role !== null} onOpenChange={handleOpenChange}>
      {role && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the {role.name} role?</AlertDialogTitle>
            <AlertDialogDescription>
              You can only delete a role that no member or invitation uses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-xs leading-[18px] text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={remove.isPending} onClick={handleDelete}>
              {remove.isPending ? "Deleting" : "Delete role"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
