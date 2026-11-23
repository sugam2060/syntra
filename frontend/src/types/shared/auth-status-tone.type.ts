export const AUTH_STATUS_TONE = {
  primary: "primary",
  success: "success",
  warning: "warning",
} as const;

export type AuthStatusTone =
  (typeof AUTH_STATUS_TONE)[keyof typeof AUTH_STATUS_TONE];
