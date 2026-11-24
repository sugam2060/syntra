import { parseLocalDate } from "@/lib/local-date";
import { API_KEY_EXPIRATION } from "@/types/schema";
import type { ApiKeyExpiration } from "@/types/schema";

const PRESET_DAYS: Partial<Record<ApiKeyExpiration, number>> = {
  [API_KEY_EXPIRATION.days30]: 30,
  [API_KEY_EXPIRATION.days90]: 90,
  [API_KEY_EXPIRATION.year1]: 365,
};

/**
 * The moment a new key stops working, or null for a key that never expires. A custom date is valid
 * through the end of that local day.
 */
export function resolveExpiresAt(
  expiration: ApiKeyExpiration,
  customDate: string,
  now: Date,
): Date | null {
  const days = PRESET_DAYS[expiration];
  if (days !== undefined) {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  if (expiration === API_KEY_EXPIRATION.custom) {
    const date = parseLocalDate(customDate);
    return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) : null;
  }
  return null;
}

const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** "Dec 5, 2026". */
export function formatKeyDate(value: Date | string): string {
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}
