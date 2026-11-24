"use client";

import { LuLoaderCircle } from "react-icons/lu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RevokeKeyDialogProps = {
  keyName: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Asks before revoking: it cannot be undone, and requests with the key fail from the next one on. */
export function RevokeKeyDialog({ keyName, isPending, onConfirm, onClose }: RevokeKeyDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(next, details) => {
        if (next) {
          return;
        }
        if (isPending) {
          details.cancel();
          return;
        }
        onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke {keyName}?</AlertDialogTitle>
          <AlertDialogDescription>Requests using this key will fail immediately.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? (
              <>
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                Revoking
              </>
            ) : (
              "Revoke key"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
