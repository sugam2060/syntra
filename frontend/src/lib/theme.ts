/** `localStorage` key of the persisted theme store (zustand `persist`). */
export const THEME_STORAGE_KEY = "syntra:theme";

/** Media query the `system` preference follows. */
export const DARK_SCHEME_QUERY ="(prefers-color-scheme: dark)";

/**
 * Runs in `<head>` before first paint so a saved dark choice never flashes light. It reads the same
 * JSON the zustand store writes (`{ state: { theme } }`), so keep both in step.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t="system";var raw=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(raw){var s=JSON.parse(raw);if(s&&s.state&&s.state.theme){t=s.state.theme}}var d=t==="dark"||(t!=="light"&&window.matchMedia(${JSON.stringify(
  DARK_SCHEME_QUERY,
)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(err){}})()`;

/** Switches the `<html>` class and `color-scheme`, muting transitions so colours change in one frame. */
export function applyResolvedTheme(isDark: boolean): void {
  const root = document.documentElement;
  const mute = document.createElement("style");
  mute.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(mute);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";

  // Reading a layout property flushes the style change before transitions come back.
  void window.getComputedStyle(root).opacity;
  window.requestAnimationFrame(() => mute.remove());
}
