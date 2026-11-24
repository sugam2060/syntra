"use client";

import { WorkspaceNotFound } from "@/components/shared/workspace-not-found";
import { ShellFrame } from "@/components/shell/shell-frame";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { StatusScreen } from "@/components/shell/status-screen";
import { WorkspaceLoadError } from "@/components/shell/workspace-load-error";
import { WorkspaceNav } from "@/components/shell/workspace-nav";
import { workspacePaths } from "@/lib/workspace-paths";
import { useWorkspaceState } from "@/providers/workspace-provider";
import { SHELL_CONTENT_WIDTH } from "@/types/shared";
import type { BreadcrumbTrailItem, ShellContentWidth } from "@/types/shared";

type AppShellProps = {
  /** The trail of the page itself, for example `[{ label: "Settings" }, { label: "API keys" }]`. The workspace is added in front automatically. */
  breadcrumb: readonly BreadcrumbTrailItem[];
  /** `contained` (default) caps the content at 1200px; `full` fills the shell, for boards. */
  contentWidth?: ShellContentWidth;
  children: React.ReactNode;
};

/**
 * Frame of every page under `/w/[slug]`: sidebar, top bar and content area. Render it once per
 * page. It reads where the workspace stands from the `WorkspaceProvider` that the `w/[slug]` layout
 * mounts and shows a skeleton, a not-found or an error screen until the workspace is ready; the page
 * content is only rendered when it is, so `useWorkspace()` is safe inside it.
 */
export function AppShell({
  breadcrumb,
  contentWidth = SHELL_CONTENT_WIDTH.contained,
  children,
}: AppShellProps) {
  const state = useWorkspaceState();

  switch (state.status) {
    case "loading":
      return <ShellSkeleton />;
    case "missing":
      return (
        <StatusScreen>
          <WorkspaceNotFound backHref="/" />
        </StatusScreen>
      );
    case "error":
      return (
        <StatusScreen>
          <WorkspaceLoadError onRetry={state.retry} />
        </StatusScreen>
      );
    case "ready": {
      const { workspace } = state;
      const trail: BreadcrumbTrailItem[] = [
        { label: workspace.name, href: workspacePaths.home(workspace.slug) },
        ...breadcrumb,
      ];
      return (
        <ShellFrame nav={<WorkspaceNav />} breadcrumb={trail} contentWidth={contentWidth}>
          {children}
        </ShellFrame>
      );
    }
  }
}
