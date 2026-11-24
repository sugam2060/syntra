/** `contained` caps the page at 1200px; `full` lets it fill the shell, for boards and wide tables. */
export const SHELL_CONTENT_WIDTH = {
  contained: "contained",
  full: "full",
} as const;

export type ShellContentWidth =
  (typeof SHELL_CONTENT_WIDTH)[keyof typeof SHELL_CONTENT_WIDTH];
