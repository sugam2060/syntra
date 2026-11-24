export const EXPIRY_TONE = {
  muted: "muted",
  default: "default",
  warning: "warning",
  danger: "danger",
} as const;

export type ExpiryTone = (typeof EXPIRY_TONE)[keyof typeof EXPIRY_TONE];

/** How the Expires column describes a key. */
export type ExpiryDescription = {
  label: string;
  /** The absolute date, shown as a tooltip when the label is relative. Null for "Never". */
  title: string | null;
  tone: ExpiryTone;
};
