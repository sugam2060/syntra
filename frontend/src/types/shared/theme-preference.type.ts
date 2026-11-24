/** What the user picked in Appearance. `system` follows the operating system's colour scheme. */
export const THEME_PREFERENCE = {
  light: "light",
  dark: "dark",
  system: "system",
} as const;

export type ThemePreference = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];
