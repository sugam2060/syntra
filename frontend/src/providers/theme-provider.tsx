"use client";

import { useEffect } from "react";

import { applyResolvedTheme, DARK_SCHEME_QUERY, THEME_STORAGE_KEY } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme.store";
import { THEME_PREFERENCE } from "@/types/shared";

/**
 * Keeps `<html class="dark">` and `color-scheme` in step with the persisted theme choice. Renders
 * nothing: the inline script in the root layout handles first paint, this takes over once the app
 * has hydrated. It rehydrates the theme store on mount and again on `storage` events, so a change
 * in another tab applies here. With the `system` choice it also follows OS scheme changes.
 */
export function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);
  const hydrated = useThemeStore((state) => state.hydrated);

  useEffect(() => {
    void useThemeStore.persist.rehydrate();

    function handleStorage(event: StorageEvent): void {
      if (event.key === THEME_STORAGE_KEY) {
        void useThemeStore.persist.rehydrate();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    // Until the saved choice is read, the store only holds the default; applying it would undo
    // what the inline script set.
    if (!hydrated) {
      return;
    }

    const media = window.matchMedia(DARK_SCHEME_QUERY);
    const apply = (): void =>
      applyResolvedTheme(
        theme === THEME_PREFERENCE.dark ||
          (theme === THEME_PREFERENCE.system && media.matches),
      );

    apply();
    if (theme !== THEME_PREFERENCE.system) {
      return;
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, hydrated]);

  return null;
}
