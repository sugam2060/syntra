export const AUTH_BANNER_VARIANT = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

export type AuthBannerVariant =
  (typeof AUTH_BANNER_VARIANT)[keyof typeof AUTH_BANNER_VARIANT];
