import {
  LuBot,
  LuChartColumn,
  LuFolderKanban,
  LuHouse,
  LuKeyRound,
  LuListChecks,
  LuSettings,
  LuUsers,
} from "react-icons/lu";

import { workspacePaths } from "@/lib/workspace-paths";
import type { ShellNavItem, WorkspaceAccess } from "@/types/shared";

type WorkspaceNav = {
  primary: ShellNavItem[];
  secondary: ShellNavItem[];
};

/**
 * The sidebar entries of a workspace. Entries the user has no use for are left out, not disabled.
 * Mark an entry `soon` until its page exists; turn it into a link by removing the flag.
 */
export function buildWorkspaceNav(slug: string, access: WorkspaceAccess): WorkspaceNav {
  const primary: ShellNavItem[] = [
    { key: "home", label: "Home", href: workspacePaths.home(slug), icon: LuHouse },
    { key: "projects", label: "Projects", href: `${workspacePaths.home(slug)}/projects`, icon: LuFolderKanban, soon: true },
    { key: "my-tasks", label: "My tasks", href: `${workspacePaths.home(slug)}/my-tasks`, icon: LuListChecks, soon: true },
    { key: "ai-chat", label: "AI chat", href: `${workspacePaths.home(slug)}/chat`, icon: LuBot, soon: true },
    { key: "reports", label: "Reports", href: `${workspacePaths.home(slug)}/reports`, icon: LuChartColumn, soon: true },
  ];

  const secondary: ShellNavItem[] = [
    { key: "members", label: "Members", href: workspacePaths.members(slug), icon: LuUsers },
  ];
  if (access.canManageApiKeys) {
    secondary.push({
      key: "api-keys",
      label: "API keys",
      href: workspacePaths.apiKeys(slug),
      icon: LuKeyRound,
    });
  }
  secondary.push({
    key: "settings",
    label: "Settings",
    href: workspacePaths.settings(slug),
    icon: LuSettings,
  });

  return { primary, secondary };
}

/**
 * The entry that matches the current URL: the one with the longest `href` that equals the pathname
 * or is a parent of it, so `/settings/api-keys` highlights API keys and not Settings.
 */
export function findActiveNavKey(
  pathname: string,
  items: readonly ShellNavItem[],
): string | null {
  let best: ShellNavItem | null = null;
  for (const item of items) {
    if (item.soon) {
      continue;
    }
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best?.key ?? null;
}
