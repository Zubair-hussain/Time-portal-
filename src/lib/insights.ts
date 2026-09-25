import type { TimeEntry, WeeklyInsight } from '@/types';
import { isoWeekKey, weekdayIndex } from '@/lib/date';
import { normalizeSeconds } from '@/lib/time';

/**
 * Aggregate approved+pending time entries into per-week insights.
 * Rejected entries are excluded. Only entries with an end time are counted.
 */
export function buildWeeklyInsights(entries: TimeEntry[]): WeeklyInsight[] {
  const byWeek = new Map<string, WeeklyInsight>();

  for (const entry of entries) {
    if (entry.status === 'rejected') continue;
    if (!entry.endedAt) continue;

    const started = new Date(entry.startedAt);
    if (Number.isNaN(started.getTime())) continue;

    const key = isoWeekKey(started);
    const seconds = normalizeSeconds(entry.durationSeconds);

    let insight = byWeek.get(key);
    if (!insight) {
      insight = {
        isoWeek: key,
        totalSeconds: 0,
        entryCount: 0,
        averagePerDaySeconds: 0,
        perWeekdaySeconds: [0, 0, 0, 0, 0, 0, 0],
      };
      byWeek.set(key, insight);
    }

    insight.totalSeconds += seconds;
    insight.entryCount += 1;
    const wd = weekdayIndex(started);
    insight.perWeekdaySeconds[wd] = (insight.perWeekdaySeconds[wd] ?? 0) + seconds;
  }

  for (const insight of byWeek.values()) {
    const activeDays = insight.perWeekdaySeconds.filter((s) => s > 0).length;
    insight.averagePerDaySeconds = activeDays > 0 ? Math.floor(insight.totalSeconds / activeDays) : 0;
  }

  // Sort chronologically by week key.
  return [...byWeek.values()].sort((a, b) => a.isoWeek.localeCompare(b.isoWeek));
}

/** Total seconds across a set of entries (excluding rejected). */
export function totalApprovedSeconds(entries: TimeEntry[]): number {
  return entries
    .filter((e) => e.status !== 'rejected' && e.endedAt)
    .reduce((sum, e) => sum + normalizeSeconds(e.durationSeconds), 0);
}
