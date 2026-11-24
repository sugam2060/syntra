import { Suspense } from "react";

import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { WorkspaceLayoutContent } from "@/components/shell/workspace-layout-content";

export default function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <WorkspaceLayoutContent params={params}>{children}</WorkspaceLayoutContent>
    </Suspense>
  );
}
