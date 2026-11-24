/** What a permission override row can be set to: no override, or an explicit allow or deny. */
export const OVERRIDE_CHOICE = {
  default: "default",
  allow: "allow",
  deny: "deny",
} as const;

export type OverrideChoice = (typeof OVERRIDE_CHOICE)[keyof typeof OVERRIDE_CHOICE];
