// frontend/src/lib/formatTime.ts
// Date/time formatting utilities per ui-rules.md Typography rules:
// - 24-hour times ("15:00")
// - Ranges with en dash ("15:00–17:00")
// - Dates as weekday-day-month ("Sat 5 Sep")
// - "Today" / "Tomorrow" substituted where applicable
// - Campus-local time, no timezone conversion or suffix

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats an ISO timestamp as "15:00" (24-hour, no seconds). */
export function formatTime(isoTs: string): string {
  const d = new Date(isoTs);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Formats two ISO timestamps as "15:00–17:00" (en dash, no space). */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)}–${formatTime(endIso)}`;
}

/** Formats an ISO timestamp as "Sat 5 Sep" with Today/Tomorrow substitution. */
export function formatDate(isoTs: string): string {
  const d = new Date(isoTs);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** Formats an ISO timestamp as "Sat 5 Sep, 15:00". */
export function formatDateTime(isoTs: string): string {
  return `${formatDate(isoTs)}, ${formatTime(isoTs)}`;
}

/** Returns how many seconds ago a timestamp was. */
export function secondsAgo(isoTs: string): number {
  return Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000);
}

/** Formats a freshness label: "Updated just now", "Updated 12s ago", "Updated 2m ago". */
export function formatFreshness(isoTs: string, stale = false): string {
  const secs = secondsAgo(isoTs);
  if (stale) {
    const mins = Math.floor(secs / 60);
    return `Last updated ${mins > 0 ? `${mins}m` : `${secs}s`} ago — couldn't refresh`;
  }
  if (secs < 10) return "Updated just now";
  if (secs < 60) return `Updated ${secs}s ago`;
  return `Updated ${Math.floor(secs / 60)}m ago`;
}

/** Derives event status from timestamps. */
export function deriveEventStatus(
  startTs: string,
  endTs?: string
): "upcoming" | "ongoing" | "completed" {
  const now = Date.now();
  const start = new Date(startTs).getTime();
  // Default event duration: 2 hours if no end_ts
  const end = endTs ? new Date(endTs).getTime() : start + 2 * 60 * 60 * 1000;
  if (now < start) return "upcoming";
  if (now >= start && now < end) return "ongoing";
  return "completed";
}
