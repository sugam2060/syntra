import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { THEME_PREFERENCE } from "@/types/shared";
import type { ThemePreference } from "@/types/shared";

type ThemeStore = {
  theme: ThemePreference;
  /** True once the saved choice has been read from `localStorage` on the client. */
  hydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
};

/**
 * The user's theme choice, persisted per browser. Hydration is deferred (`skipHydration`) so the
 * server render and the first client render agree on `system`; `ThemeSync` calls `rehydrate()`.
 * Only `theme` is saved (`partialize`); `hydrated` flips to true after the first rehydrate.
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: THEME_PREFERENCE.system,
      hydrated: false,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => window.localStorage),
      partialize: ({ theme }) => ({ theme }),
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hydrated: true });
      },
    },
  ),
);
