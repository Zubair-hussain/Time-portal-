/**
 * Pure time helpers. No side effects — fully unit-testable.
 */

/** Clamp a possibly-negative or NaN duration to a safe non-negative integer. */
export function normalizeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.floor(seconds);
}

/** Compute duration in seconds between two ISO timestamps. */
export function durationBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return normalizeSeconds((end - start) / 1000);
}

/** Format seconds as `H:MM:SS`. */
export function formatClock(totalSeconds: number): string {
  const s = normalizeSeconds(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

/** Format seconds into a compact human string, e.g. "2h 15m" or "45m" or "30s". */
export function formatHuman(totalSeconds: number): string {
  const s = normalizeSeconds(totalSeconds);
  if (s < 60) return `${s}s`;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Convert seconds to fractional hours rounded to 2 decimals. */
export function toHours(totalSeconds: number): number {
  return Math.round((normalizeSeconds(totalSeconds) / 3600) * 100) / 100;
}
