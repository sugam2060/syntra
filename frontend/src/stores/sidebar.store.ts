import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SidebarStore = {
  /** Desktop sidebar collapsed to its icon rail. */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

/**
 * Whether the desktop sidebar is collapsed, remembered per browser. Server and first client render
 * are expanded (`skipHydration`); `ShellFrame` calls `rehydrate()` after mount.
 */
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: "syntra:sidebar-collapsed",
      version: 1,
      storage: createJSONStorage(() => window.localStorage),
      skipHydration: true,
    },
  ),
);
