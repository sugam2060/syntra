"use client";

import type { IconType } from "react-icons";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme.store";
import { THEME_PREFERENCE } from "@/types/shared";
import type { ThemePreference } from "@/types/shared";

const THEME_OPTIONS: readonly { value: ThemePreference; label: string; icon: IconType }[] = [
  { value: THEME_PREFERENCE.light, label: "Light", icon: LuSun },
  { value: THEME_PREFERENCE.dark, label: "Dark", icon: LuMoon },
  { value: THEME_PREFERENCE.system, label: "System", icon: LuMonitor },
];

/** Light / Dark / System choice, saved in the persisted theme store. */
export function ThemeToggleGroup({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <ToggleGroup
      aria-label="Theme"
      variant="outline"
      spacing={0}
      value={[theme]}
      onValueChange={(next) => {
        const picked = THEME_OPTIONS.find((option) => option.value === next[0]);
        // Pressing the active option would clear the group; a theme is always selected.
        if (picked) {
          setTheme(picked.value);
        }
      }}
      className={cn("bg-background dark:bg-surface", className)}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="gap-1.5 px-3 aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        >
          <Icon aria-hidden="true" />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
