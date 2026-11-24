const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "always" });
const calendarDate = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/**
 * How long ago something happened: "3 days ago", "5 hours ago", or "Just now" under a minute.
 *
 * @param isoTimestamp ISO timestamp from the gateway.
 * @param now Current time in epoch milliseconds, passed in so rendering stays pure.
 */
export function describeElapsed(isoTimestamp: string, now: number): string {
  const elapsed = now - Date.parse(isoTimestamp);
  if (Number.isNaN(elapsed)) {
    return "Unknown";
  }
  if (elapsed < MINUTE_MS) {
    return "Just now";
  }
  if (elapsed < HOUR_MS) {
    return relativeTime.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  }
  if (elapsed < DAY_MS) {
    return relativeTime.format(-Math.floor(elapsed / HOUR_MS), "hour");
  }
  return relativeTime.format(-Math.floor(elapsed / DAY_MS), "day");
}

/** A calendar date such as "Jan 5, 2026". */
export function formatDate(isoTimestamp: string): string {
  const time = Date.parse(isoTimestamp);
  return Number.isNaN(time) ? "Unknown" : calendarDate.format(time);
}
