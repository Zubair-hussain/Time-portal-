import type { MonthlyAward, PortalUser, TimeEntry } from '@/types';
import { monthKey } from '@/lib/date';
import { normalizeSeconds } from '@/lib/time';

/**
 * Compute the monthly award winner: the user with the most APPROVED seconds
 * in a given month. Only approved entries count toward an award (admins must
 * review first). Returns null when there is no qualifying activity.
 */
export function computeMonthlyAward(
  month: string,
  entries: TimeEntry[],
  users: PortalUser[],
): MonthlyAward | null {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status !== 'approved' || !entry.endedAt) continue;
    const started = new Date(entry.startedAt);
    if (Number.isNaN(started.getTime())) continue;
    if (monthKey(started) !== month) continue;

    totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + normalizeSeconds(entry.durationSeconds));
  }

  let winnerId: string | null = null;
  let best = 0;
  for (const [userId, seconds] of totals) {
    if (seconds > best) {
      best = seconds;
      winnerId = userId;
    }
  }

  if (!winnerId || best <= 0) return null;

  const user = users.find((u) => u.id === winnerId);
  return {
    month,
    userId: winnerId,
    displayName: user?.displayName ?? user?.email ?? 'Unknown',
    totalSeconds: best,
  };
}

/** Rank users by approved seconds in a month (descending). */
export function monthlyLeaderboard(
  month: string,
  entries: TimeEntry[],
  users: PortalUser[],
): MonthlyAward[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status !== 'approved' || !entry.endedAt) continue;
    const started = new Date(entry.startedAt);
    if (Number.isNaN(started.getTime())) continue;
    if (monthKey(started) !== month) continue;
    totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + normalizeSeconds(entry.durationSeconds));
  }

  return [...totals.entries()]
    .map(([userId, totalSeconds]) => {
      const user = users.find((u) => u.id === userId);
      return {
        month,
        userId,
        displayName: user?.displayName ?? user?.email ?? 'Unknown',
        totalSeconds,
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}
