"use client";

import { LuArrowLeft, LuShieldCheck } from "react-icons/lu";

import { useMyWorkspaces } from "@/api/workspaces";
import { SidebarNavGroup } from "@/components/shell/sidebar-nav-group";
import { SidebarContent } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_PATH, workspacePaths } from "@/lib/workspace-paths";
import type { ShellNavItem } from "@/types/shared";

const ACCOUNT_ITEMS: ShellNavItem[] = [
  { key: "security", label: "Security", href: ACCOUNT_PATH.security, icon: LuShieldCheck },
];

/** Sidebar content of an account page: a way back to the first workspace, then the account pages. */
export function AccountNav() {
  const workspaces = useMyWorkspaces();
  const first = workspaces.data?.[0];

  const backItems: ShellNavItem[] = first
    ? [
        {
          key: "back",
          label: `Back to ${first.name}`,
          href: workspacePaths.home(first.slug),
          icon: LuArrowLeft,
        },
      ]
    : [];

  return (
    <SidebarContent>
      <nav aria-label="Account" className="flex flex-col">
        {workspaces.isPending && (
          <div className="p-2 pb-0" aria-hidden="true">
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {backItems.length > 0 && <SidebarNavGroup label="Back" items={backItems} allItems={[]} />}
        <SidebarNavGroup label="Account" items={ACCOUNT_ITEMS} heading />
      </nav>
    </SidebarContent>
  );
}
