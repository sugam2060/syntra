"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuChevronsUpDown, LuLogOut, LuShieldCheck } from "react-icons/lu";
import { toast } from "sonner";

import { useCurrentUser, useLogout } from "@/api/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/user-display";
import { ACCOUNT_PATH } from "@/lib/workspace-paths";

const SIGN_OUT_FAILED_TOAST_ID = "sign-out-failed";

/** Bottom of the sidebar: the signed-in user, with a menu for account security and signing out. */
export function SidebarUserMenu() {
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const onNavigate = (): void => setOpenMobile(false);
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

  if (!user.data) {
    return (
      <div className="flex h-11 items-center gap-2.5 p-1.5">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:hidden" />
      </div>
    );
  }

  const displayName = user.data.name ?? user.data.email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Account menu for ${displayName}`}
                className="data-open:bg-sidebar-accent"
              />
            }
          >
            <Avatar className="size-7">
              {user.data.avatarUrl && <AvatarImage src={user.data.avatarUrl} alt="" />}
              <AvatarFallback className="bg-accent text-xs font-medium text-primary">
                {getInitials(user.data)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm leading-5 font-medium text-foreground">
              {displayName}
            </span>
            <LuChevronsUpDown aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side={collapsed ? "right" : "top"} className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
                <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                {user.data.name && (
                  <span className="truncate text-xs font-normal">{user.data.email}</span>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={ACCOUNT_PATH.security} onClick={onNavigate} />}>
              <LuShieldCheck aria-hidden="true" />
              Account security
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} disabled={logout.isPending}>
              <LuLogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
