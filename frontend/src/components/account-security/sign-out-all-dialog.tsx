"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";

import { useLogoutAll } from "@/api/auth";
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

type SignOutAllDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SignOutAllDialog({ open, onOpenChange }: SignOutAllDialogProps) {
  const router = useRouter();
  const logoutAll = useLogoutAll();
  const [failure, setFailure] = useState<string | null>(null);

  function handleOpenChange(next: boolean): void {
    if (logoutAll.isPending) {
      return;
    }
    if (!next) {
      setFailure(null);
      logoutAll.reset();
    }
    onOpenChange(next);
  }

  function handleSignOutAll(): void {
    setFailure(null);
    logoutAll.mutate(undefined, {
      onSuccess: () => router.replace("/login"),
      onError: (error) =>
        setFailure(
          error instanceof ApiError && error.status === 429
            ? "Too many attempts. Try again in a minute."
            : error instanceof ApiError && error.status === 0
              ? error.message
              : "Couldn't sign out of all devices. Try again.",
        ),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="rounded-[12px] p-5">
        <AlertDialogHeader className="gap-1">
          <AlertDialogTitle className="text-base leading-6 font-semibold">
            Sign out of all devices?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Every session ends, including this one. You&apos;ll need to sign in again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {failure && <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{failure}</AuthBanner>}

        <AlertDialogFooter className="-mx-5 -mb-5 px-5">
          <AlertDialogCancel disabled={logoutAll.isPending} className="h-10 sm:h-8">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={logoutAll.isPending || logoutAll.isSuccess}
            onClick={handleSignOutAll}
            className="h-10 gap-2 sm:h-8"
          >
            {logoutAll.isPending || logoutAll.isSuccess ? (
              <>
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                Signing out...
              </>
            ) : (
              "Sign out everywhere"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
