import { formatKeyDate } from "@/lib/api-key-expiry";
import { formatTimeAgo, formatTimeUntil } from "@/lib/api-key-time";
import { EXPIRY_TONE } from "@/types/api-keys";
import type { ExpiryDescription } from "@/types/api-keys";
import type { ApiKeySummary } from "@/types/shared";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Under this much time left the expiry is shown in amber. */
const SOON_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The Expires column: "Never" (muted), a date, "in 6 days" in amber when it is close, or "Expired".
 * Revoked keys are dimmed by their row, so their expiry is shown plainly.
 */
export function describeKeyExpiry(
  key: Pick<ApiKeySummary, "expiresAt" | "revokedAt">,
  now: number,
): ExpiryDescription {
  if (!key.expiresAt) {
    return { label: "Never", title: null, tone: EXPIRY_TONE.muted };
  }
  const title = formatKeyDate(key.expiresAt);
  const remaining = Date.parse(key.expiresAt) - now;
  if (remaining <= 0) {
    return { label: "Expired", title, tone: key.revokedAt ? EXPIRY_TONE.muted : EXPIRY_TONE.danger };
  }
  if (!key.revokedAt && remaining < SOON_MS) {
    const label = formatTimeUntil(key.expiresAt, now);
    return { label: label ? capitalize(label) : title, title, tone: EXPIRY_TONE.warning };
  }
  return { label: title, title: null, tone: EXPIRY_TONE.default };
}

/** "2 hours ago", or "Never used". Approximate: the gateway refreshes it at most every 5 minutes. */
export function describeLastUsed(lastUsedAt: string | null, now: number): string {
  return lastUsedAt ? formatTimeAgo(lastUsedAt, now) : "Never used";
}

/** The curl example shown with a new key. `baseUrl` is the gateway's API base URL. */
export function buildCurlExample(baseUrl: string, workspaceId: string): string {
  return `curl -H "Authorization: Bearer sk_…" \\n  ${baseUrl}/workspaces/${workspaceId}`;
}
