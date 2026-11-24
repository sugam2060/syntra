"use client";

import Link from "next/link";
import { LuCheck, LuChevronsUpDown, LuPlus } from "react-icons/lu";

import { useMyWorkspaces } from "@/api/workspaces";
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
import { ONBOARDING_PATH } from "@/lib/onboarding-paths";
import { cn } from "@/lib/utils";
import { workspacePaths } from "@/lib/workspace-paths";
import type { Workspace } from "@/types/shared";

type WorkspaceSwitcherProps = {
  current: Workspace;
};

function WorkspaceTile({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "W"}
    </span>
  );
}

/** Top of the sidebar: the current workspace, and a menu to move to another one or create a new one. */
export function WorkspaceSwitcher({ current }: WorkspaceSwitcherProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const onNavigate = (): void => setOpenMobile(false);
  const workspaces = useMyWorkspaces();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Switch workspace. Current: ${current.name}`}
                className="data-open:bg-sidebar-accent"
              />
            }
          >
            <WorkspaceTile name={current.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm leading-5 font-medium text-foreground">
                {current.name}
              </span>
              <span className="truncate text-xs leading-4 text-muted-foreground">
                {current.role.name}
              </span>
            </span>
            <LuChevronsUpDown
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side={collapsed ? "right" : "bottom"}
            className="w-64"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {workspaces.isPending && (
                <div className="px-1.5 py-1" aria-hidden="true">
                  <Skeleton className="h-5 w-full" />
                </div>
              )}
              {workspaces.isError && (
                <p role="status" className="px-1.5 py-1 text-xs text-muted-foreground">
                  Couldn&apos;t load your workspaces.
                </p>
              )}
              {workspaces.data?.map((workspace) => {
                const isCurrent = workspace.id === current.id;
                return (
                  <DropdownMenuItem
                    key={workspace.id}
                    render={
                      <Link
                        href={workspacePaths.home(workspace.slug)}
                        aria-current={isCurrent ? "true" : undefined}
                        onClick={onNavigate}
                      />
                    }
                  >
                    <WorkspaceTile name={workspace.name} className="size-5 text-[11px]" />
                    <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                    {isCurrent && <LuCheck aria-hidden="true" className="text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href={ONBOARDING_PATH.workspace} onClick={onNavigate} />}
            >
              <LuPlus aria-hidden="true" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
