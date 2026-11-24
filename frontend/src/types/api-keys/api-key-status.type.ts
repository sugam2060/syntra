/** Derived in the UI: revoked (`revokedAt` set), expired (`expiresAt` in the past), otherwise active. */
export const API_KEY_STATUS = {
  active: "active",
  expired: "expired",
  revoked: "revoked",
} as const;

export type ApiKeyStatus = (typeof API_KEY_STATUS)[keyof typeof API_KEY_STATUS];
