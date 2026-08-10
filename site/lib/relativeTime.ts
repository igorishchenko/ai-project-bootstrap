const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "4 minutes ago", "6 days ago". Deliberately coarse — the only consumer is a
 * last-used line, where minute-level precision would imply a freshness the
 * timestamp doesn't have.
 */
export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "at an unknown time";

  const delta = Math.max(0, now - then);
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) {
    const n = Math.floor(delta / MINUTE);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  if (delta < DAY) {
    const n = Math.floor(delta / HOUR);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  const n = Math.floor(delta / DAY);
  return `${n} day${n === 1 ? "" : "s"} ago`;
}
