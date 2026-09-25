/**
 * ISO week / month key helpers. Pure and deterministic (UTC-based).
 */

/** Return the ISO-8601 week key for a date, e.g. "2026-W39". */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO week day: Monday=1 .. Sunday=7
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Shift to the Thursday of this week.
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/** Return the month key for a date, e.g. "2026-09". */
export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/** ISO weekday index with Monday=0 .. Sunday=6. */
export function weekdayIndex(date: Date): number {
  const day = date.getUTCDay(); // Sunday=0 .. Saturday=6
  return day === 0 ? 6 : day - 1;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
