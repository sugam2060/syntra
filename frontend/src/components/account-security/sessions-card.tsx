"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useLogout } from "@/api/auth";
import { SecurityCard } from "@/components/account-security/security-card";
import { SignOutAllDialog } from "@/components/account-security/sign-out-all-dialog";
import { Button } from "@/components/ui/button";

const SIGN_OUT_FAILED_TOAST_ID = "sign-out-failed";

export function SessionsCard() {
  const router = useRouter();
  const logout = useLogout();
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  function handleSignOut(): void {
    logout.mutate(undefined, {
      onError: () =>
        toast.error("Couldn't reach the server. You were signed out on this device only.", {
          id: SIGN_OUT_FAILED_TOAST_ID,
        }),
      onSettled: () => router.replace("/login"),
    });
  }

  return (
    <SecurityCard title="Sessions">
      <p className="max-w-[60ch] text-sm leading-5 text-pretty text-muted-foreground">
        Signing out of all devices ends every session, including this one.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={logout.isPending}
          onClick={handleSignOut}
          className="h-10 gap-2 px-4 sm:h-9"
        >
          {logout.isPending ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Signing out
            </>
          ) : (
            "Sign out"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setSignOutAllOpen(true)}
          className="h-10 border-destructive/40 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 dark:border-destructive/50 dark:bg-transparent dark:hover:bg-destructive/20"
        >
          Sign out of all devices
        </Button>
      </div>
      <SignOutAllDialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen} />
    </SecurityCard>
  );
}
