/** Colour of the `AuthStatusIcon` circle. `danger` is used by the `/auth/callback` error state. */
export const AUTH_STATUS_TONE = {
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

export type AuthStatusTone =
  (typeof AUTH_STATUS_TONE)[keyof typeof AUTH_STATUS_TONE];
