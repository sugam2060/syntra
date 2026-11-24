"use client";

import { useEffect } from "react";

import { SidebarThemeMenu } from "@/components/shell/sidebar-theme-menu";
import { SidebarUserMenu } from "@/components/shell/sidebar-user-menu";
import { ShellTopBar } from "@/components/shell/shell-top-bar";
import {
  Sidebar,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar.store";
import { SHELL_CONTENT_WIDTH } from "@/types/shared";
import type { BreadcrumbTrailItem, ShellContentWidth } from "@/types/shared";

type ShellFrameProps = {
  /** Sidebar content between the top and the footer: `SidebarHeader` / `SidebarContent` parts. */
  nav: React.ReactNode;
  breadcrumb: readonly BreadcrumbTrailItem[];
  contentWidth?: ShellContentWidth;
  children: React.ReactNode;
};

/** The chrome shared by every authenticated page: sidebar, top bar and the scrolling content area. */
export function ShellFrame({
  nav,
  breadcrumb,
  contentWidth = SHELL_CONTENT_WIDTH.contained,
  children,
}: ShellFrameProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const setCollapsed = useSidebarStore((state) => state.setCollapsed);

  useEffect(() => {
    void useSidebarStore.persist.rehydrate();
  }, []);

  return (
    <TooltipProvider delay={300}>
      <SidebarProvider
        open={!collapsed}
        onOpenChange={(open) => setCollapsed(!open)}
        className="h-dvh min-h-0 overflow-hidden bg-background"
      >
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          Skip to content
        </a>

        <Sidebar collapsible="icon">
          {nav}
          <SidebarFooter className="gap-1 border-t border-sidebar-border">
            <SidebarThemeMenu />
            <SidebarUserMenu />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <ShellTopBar breadcrumb={breadcrumb} />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto outline-none"
          >
            <div
              className={cn(
                "w-full px-4 py-6 sm:px-6",
                contentWidth === SHELL_CONTENT_WIDTH.contained && "max-w-[1200px]",
              )}
            >
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
