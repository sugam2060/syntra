const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * "just now", "5 minutes ago", "2 hours ago", "3 days ago", or the date for anything older than 30 days.
 * Future moments (clock skew) read as "just now".
 *
 * @param now Epoch milliseconds, passed in so rendering stays pure.
 */
export function formatTimeAgo(value: string, now: number): string {
  const elapsed = now - Date.parse(value);
  if (Number.isNaN(elapsed)) {
    return "Unknown";
  }
  if (elapsed < MINUTE_MS) {
    return "Just now";
  }
  if (elapsed < HOUR_MS) {
    return formatter.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  }
  if (elapsed < DAY_MS) {
    return formatter.format(-Math.floor(elapsed / HOUR_MS), "hour");
  }
  if (elapsed < 30 * DAY_MS) {
    return formatter.format(-Math.floor(elapsed / DAY_MS), "day");
  }
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

/** "in 6 days", "in 5 hours", "in 12 minutes" for a moment in the future; null once it has passed. */
export function formatTimeUntil(value: string, now: number): string | null {
  const remaining = Date.parse(value) - now;
  if (Number.isNaN(remaining) || remaining <= 0) {
    return null;
  }
  if (remaining >= DAY_MS) {
    return formatter.format(Math.floor(remaining / DAY_MS), "day");
  }
  if (remaining >= HOUR_MS) {
    return formatter.format(Math.floor(remaining / HOUR_MS), "hour");
  }
  return formatter.format(Math.max(1, Math.ceil(remaining / MINUTE_MS)), "minute");
}
