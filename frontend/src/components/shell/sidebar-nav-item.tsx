"use client";

import Link from "next/link";

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/types/shared";

type SidebarNavItemProps = {
  item: ShellNavItem;
  active: boolean;
};

/**
 * One row of the sidebar. A link by default; with `soon` it is greyed out, carries a "Soon" badge
 * and does nothing. In the icon rail only the icon is shown and the label moves to a tooltip.
 */
export function SidebarNavItem({ item, active }: SidebarNavItemProps) {
  const { setOpenMobile } = useSidebar();
  const Icon = item.icon;

  if (item.soon) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-disabled="true"
          tabIndex={-1}
          tooltip={`${item.label} (coming soon)`}
          className="h-10 cursor-not-allowed text-muted-foreground/70 hover:bg-transparent hover:text-muted-foreground/70 aria-disabled:pointer-events-auto md:h-8"
        >
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="top-1/2 right-2 -translate-y-1/2 rounded-full border border-border text-[11px] leading-4 text-muted-foreground">
          Soon
        </SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className="h-10 text-muted-foreground md:h-8"
        render={
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpenMobile(false)}
          />
        }
      >
        <Icon aria-hidden="true" className={cn(active && "text-primary")} />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
