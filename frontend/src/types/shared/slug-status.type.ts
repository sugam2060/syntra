/** What a workspace URL field knows about the typed slug. */
export const SLUG_STATUS = {
  idle: "idle",
  /** The typed slug is the workspace's own current one: nothing to check, nothing to change. */
  current: "current",
  checking: "checking",
  available: "available",
  taken: "taken",
  reserved: "reserved",
  invalid: "invalid",
  /** The check could not run (for example rate limited). The server still validates on submit. */
  unknown: "unknown",
} as const;

export type SlugStatus = (typeof SLUG_STATUS)[keyof typeof SLUG_STATUS];
