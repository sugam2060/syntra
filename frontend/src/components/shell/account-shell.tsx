"use client";

import { AccountNav } from "@/components/shell/account-nav";
import { ShellFrame } from "@/components/shell/shell-frame";
import { ACCOUNT_PATH } from "@/lib/workspace-paths";
import { SHELL_CONTENT_WIDTH } from "@/types/shared";
import type { BreadcrumbTrailItem, ShellContentWidth } from "@/types/shared";

type AccountShellProps = {
  /** The trail of the page itself, for example `[{ label: "Security" }]`. "Account" is added in front automatically. */
  breadcrumb: readonly BreadcrumbTrailItem[];
  contentWidth?: ShellContentWidth;
  children: React.ReactNode;
};

/**
 * The same chrome as `AppShell` for pages that belong to the user, not to a workspace
 * (`/account/*`). It needs no `WorkspaceProvider`.
 */
export function AccountShell({
  breadcrumb,
  contentWidth = SHELL_CONTENT_WIDTH.contained,
  children,
}: AccountShellProps) {
  const trail: BreadcrumbTrailItem[] = [
    { label: "Account", href: ACCOUNT_PATH.security },
    ...breadcrumb,
  ];

  return (
    <ShellFrame nav={<AccountNav />} breadcrumb={trail} contentWidth={contentWidth}>
      {children}
    </ShellFrame>
  );
}
