import { API_KEY_STATUS } from "@/types/api-keys";
import type { ApiKeyStatus } from "@/types/api-keys";
import type { ApiKeySummary } from "@/types/shared";

/** Revoked wins over expired. `now` is epoch milliseconds, passed in so rendering stays pure. */
export function getApiKeyStatus(
  key: Pick<ApiKeySummary, "revokedAt" | "expiresAt">,
  now: number,
): ApiKeyStatus {
  if (key.revokedAt) {
    return API_KEY_STATUS.revoked;
  }
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) {
    return API_KEY_STATUS.expired;
  }
  return API_KEY_STATUS.active;
}

/** The gateway allows at most this many keys that are neither revoked nor expired. */
export const MAX_ACTIVE_API_KEYS = 20;

export function countActiveKeys(keys: readonly ApiKeySummary[], now: number): number {
  return keys.filter((key) => getApiKeyStatus(key, now) === API_KEY_STATUS.active).length;
}
