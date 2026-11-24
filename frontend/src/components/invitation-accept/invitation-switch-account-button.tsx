"use client";

import { useRouter } from "next/navigation";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useLogout } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { loginPathWithNext } from "@/lib/invitation-paths";
import { cn } from "@/lib/utils";

const SIGN_OUT_FAILED_TOAST_ID = "invitation-sign-out-failed";

type InvitationSwitchAccountButtonProps = {
  /** The accept page URL (path and query) to come back to after signing in again. */
  returnPath: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
};

/** Signs out of this device first, then opens sign-in with a way back to this invitation. */
export function InvitationSwitchAccountButton({
  returnPath,
  children,
  variant = "default",
}: InvitationSwitchAccountButtonProps) {
  const router = useRouter();
  const logout = useLogout();

  function handleClick(): void {
    logout.mutate(undefined, {
      onError: () =>
        toast.error(
          "Couldn't reach the server. You were signed out on this device only.",
          { id: SIGN_OUT_FAILED_TOAST_ID },
        ),
      onSettled: () => router.replace(loginPathWithNext(returnPath)),
    });
  }

  return (
    <Button
      type="button"
      size="lg"
      variant={variant}
      disabled={logout.isPending}
      onClick={handleClick}
      className={cn(
        "h-10 w-full gap-2 px-4 sm:h-9",
        variant === "default" && "hover:bg-primary-hover",
      )}
    >
      {logout.isPending ? (
        <>
          <LuLoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Signing out...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
