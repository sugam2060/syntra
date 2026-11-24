"use client";

import { useRouter } from "next/navigation";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useCurrentUser, useLogout } from "@/api/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/user-display";

const SIGN_OUT_FAILED_TOAST_ID = "sign-out-failed";

/** Signed-in user in the top bar: avatar, name from `sm` up, and a Sign out button. */
export function UserMenu() {
  const router = useRouter();
  const user = useCurrentUser();
  const logout = useLogout();

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
    <div className="flex items-center gap-3">
      {user.isPending ? (
        <Skeleton aria-hidden="true" className="size-7 rounded-full" />
      ) : user.data ? (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            {user.data.avatarUrl && (
              <AvatarImage src={user.data.avatarUrl} alt="" />
            )}
            <AvatarFallback className="bg-accent text-xs font-medium text-primary">
              {getInitials(user.data)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs leading-4 font-medium text-foreground sm:inline">
            {user.data.name ?? user.data.email}
          </span>
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={logout.isPending}
        onClick={handleSignOut}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
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
    </div>
  );
}
