"use client";

import { useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useUnlinkGoogle } from "@/api/auth";
import { AuthBanner } from "@/components/shared/auth-banner";
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
import { ApiError } from "@/lib/api-error";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const NOT_LINKED_TOAST_ID = "google-not-linked";

type UnlinkGoogleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Add a password first. Google is your only way to sign in.";
    }
    if (error.status === 429) {
      return "Too many attempts. Try again in a minute.";
    }
    if (error.status === 0) {
      return error.message;
    }
  }
  return "Couldn't unlink Google. Try again.";
}

export function UnlinkGoogleDialog({ open, onOpenChange }: UnlinkGoogleDialogProps) {
  const unlink = useUnlinkGoogle();
  const [failure, setFailure] = useState<string | null>(null);

  function handleOpenChange(next: boolean): void {
    if (unlink.isPending) {
      return;
    }
    if (!next) {
      setFailure(null);
      unlink.reset();
    }
    onOpenChange(next);
  }

  function handleUnlink(): void {
    setFailure(null);
    unlink.mutate(undefined, {
      onSuccess: () => {
        toast.success("Google unlinked.");
        onOpenChange(false);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          // Already unlinked elsewhere: the profile refetch brings the row back in line.
          toast.error("Google isn't linked to this account.", { id: NOT_LINKED_TOAST_ID });
          onOpenChange(false);
          return;
        }
        setFailure(failureMessage(error));
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="rounded-[12px] p-5">
        <AlertDialogHeader className="gap-1">
          <AlertDialogTitle className="text-base leading-6 font-semibold">
            Unlink Google?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll sign in with your email and password instead.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {failure && <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{failure}</AuthBanner>}

        <AlertDialogFooter className="-mx-5 -mb-5 px-5">
          <AlertDialogCancel disabled={unlink.isPending} className="h-10 sm:h-8">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={unlink.isPending}
            onClick={handleUnlink}
            className="h-10 gap-2 sm:h-8"
          >
            {unlink.isPending ? (
              <>
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                Unlinking...
              </>
            ) : (
              "Unlink"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
