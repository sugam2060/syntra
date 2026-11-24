import type { InvitationExpiry } from "@/types/invitation-accept";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Under this much time left the expiry is shown in amber. */
const URGENT_BELOW_MS = 2 * DAY_MS;

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/**
 * Describes when an invitation stops working: "in 6 days" while there is time, then hours, then minutes.
 * Below two days it is flagged `urgent`.
 *
 * @param expiresAt ISO timestamp from the preview.
 * @param now Current time in epoch milliseconds, passed in so rendering stays pure.
 */
export function describeExpiry(expiresAt: string, now: number): InvitationExpiry {
  const remaining = Date.parse(expiresAt) - now;
  if (Number.isNaN(remaining)) {
    return { label: "Unknown", urgent: false };
  }
  if (remaining <= 0) {
    return { label: "Expired", urgent: true };
  }
  if (remaining >= URGENT_BELOW_MS) {
    return {
      label: relativeTime.format(Math.floor(remaining / DAY_MS), "day"),
      urgent: false,
    };
  }
  if (remaining >= HOUR_MS) {
    return {
      label: relativeTime.format(Math.floor(remaining / HOUR_MS), "hour"),
      urgent: true,
    };
  }
  return {
    label: relativeTime.format(Math.max(1, Math.ceil(remaining / MINUTE_MS)), "minute"),
    urgent: true,
  };
}
