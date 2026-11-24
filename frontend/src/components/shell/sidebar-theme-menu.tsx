"use client";

import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";

import { ThemeToggleGroup } from "@/components/shared/theme-toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useThemeStore } from "@/stores/theme.store";
import { THEME_PREFERENCE } from "@/types/shared";

/** Sidebar footer entry that opens a popover with the Light / Dark / System choice. */
export function SidebarThemeMenu() {
  const theme = useThemeStore((state) => state.theme);
  const Icon =
    theme === THEME_PREFERENCE.dark
      ? LuMoon
      : theme === THEME_PREFERENCE.light
        ? LuSun
        : LuMonitor;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger render={<SidebarMenuButton aria-label="Change theme" />}>
            <Icon aria-hidden="true" />
            <span>Theme</span>
            <span className="ml-auto text-xs text-muted-foreground capitalize">{theme}</span>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-auto gap-2">
            <p className="px-0.5 text-xs font-medium text-muted-foreground">Theme</p>
            <ThemeToggleGroup />
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
