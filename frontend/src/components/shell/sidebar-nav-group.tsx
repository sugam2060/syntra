"use client";

import { usePathname } from "next/navigation";

import { SidebarNavItem } from "@/components/shell/sidebar-nav-item";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { findActiveNavKey } from "@/lib/workspace-nav";
import type { ShellNavItem } from "@/types/shared";

type SidebarNavGroupProps = {
  label: string;
  items: readonly ShellNavItem[];
  /** Entries of the whole sidebar, so a parent route never wins over a more specific one in another group. */
  allItems?: readonly ShellNavItem[];
  /** Show `label` as a visible heading (hidden in the icon rail). */
  heading?: boolean;
  className?: string;
};

/** A labelled list of sidebar entries; highlights the one that matches the current URL. */
export function SidebarNavGroup({
  label,
  items,
  allItems = items,
  heading = false,
  className,
}: SidebarNavGroupProps) {
  const pathname = usePathname();
  const activeKey = findActiveNavKey(pathname, allItems);

  return (
    <SidebarGroup className={className}>
      {heading && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu aria-label={label} className="gap-0.5">
          {items.map((item) => (
            <SidebarNavItem key={item.key} item={item} active={item.key === activeKey} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
