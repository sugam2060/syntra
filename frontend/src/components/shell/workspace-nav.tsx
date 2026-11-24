"use client";

import { SidebarNavGroup } from "@/components/shell/sidebar-nav-group";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import { SidebarContent, SidebarHeader, SidebarSeparator } from "@/components/ui/sidebar";
import { buildWorkspaceNav } from "@/lib/workspace-nav";
import { useWorkspace } from "@/providers/workspace-provider";

/** Sidebar content of a workspace page: the switcher, the product pages, and the workspace management pages at the bottom. */
export function WorkspaceNav() {
  const { workspace, access } = useWorkspace();
  const { primary, secondary } = buildWorkspaceNav(workspace.slug, access);
  const everyItem = [...primary, ...secondary];

  return (
    <>
      <SidebarHeader>
        <WorkspaceSwitcher current={workspace} />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Workspace" className="flex flex-1 flex-col justify-between">
          <SidebarNavGroup label="Workspace" items={primary} allItems={everyItem} />
          <div>
            <SidebarSeparator className="mx-0 mb-0" />
            <SidebarNavGroup label="Manage" items={secondary} allItems={everyItem} />
          </div>
        </nav>
      </SidebarContent>
    </>
  );
}
