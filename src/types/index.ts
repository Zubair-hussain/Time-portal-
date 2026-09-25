/**
 * Shared domain types for the Time Portal.
 * Kept framework-agnostic so they can be imported by both UI and pure logic.
 */

/** Roles are derived from the Supabase JWT `app_metadata.role` claim. */
export type UserRole = 'admin' | 'member';

export interface PortalUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

/** A single tracked interval of work. Durations are stored in seconds. */
export interface TimeEntry {
  id: string;
  userId: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 end timestamp. `null` while the timer is running. */
  endedAt: string | null;
  /** Duration in seconds; derived for running entries. */
  durationSeconds: number;
  note: string;
  /** Admin review status. */
  status: EntryStatus;
}

export type EntryStatus = 'pending' | 'approved' | 'rejected';

/** Aggregated stats for a single ISO week. */
export interface WeeklyInsight {
  /** ISO week key, e.g. "2026-W39". */
  isoWeek: string;
  totalSeconds: number;
  entryCount: number;
  /** Average seconds per active day in the week. */
  averagePerDaySeconds: number;
  /** Per-weekday breakdown, index 0 = Monday .. 6 = Sunday. */
  perWeekdaySeconds: number[];
}

/** The winner of a monthly award. */
export interface MonthlyAward {
  /** Month key, e.g. "2026-09". */
  month: string;
  userId: string;
  displayName: string;
  totalSeconds: number;
}

/** Result of a JWT inspection. */
export interface JwtInfo {
  valid: boolean;
  role: UserRole;
  userId: string | null;
  email: string | null;
  /** Expiry as a UNIX epoch (seconds), or null when absent. */
  expiresAt: number | null;
  reason?: string;
}
