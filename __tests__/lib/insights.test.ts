import { buildWeeklyInsights, totalApprovedSeconds } from '@/lib/insights';
import type { TimeEntry } from '@/types';

function entry(partial: Partial<TimeEntry>): TimeEntry {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u1',
    startedAt: '2026-09-21T09:00:00Z',
    endedAt: '2026-09-21T10:00:00Z',
    durationSeconds: 3600,
    note: '',
    status: 'approved',
    ...partial,
  };
}

describe('buildWeeklyInsights', () => {
  it('aggregates entries by ISO week', () => {
    const insights = buildWeeklyInsights([
      entry({ startedAt: '2026-09-21T09:00:00Z', durationSeconds: 3600 }), // Mon W39
      entry({ startedAt: '2026-09-22T09:00:00Z', durationSeconds: 1800 }), // Tue W39
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.isoWeek).toBe('2026-W39');
    expect(insights[0]?.totalSeconds).toBe(5400);
    expect(insights[0]?.entryCount).toBe(2);
  });

  it('excludes rejected and running entries', () => {
    const insights = buildWeeklyInsights([
      entry({ status: 'rejected', durationSeconds: 9999 }),
      entry({ endedAt: null, durationSeconds: 0 }),
      entry({ durationSeconds: 600 }),
    ]);
    expect(insights[0]?.totalSeconds).toBe(600);
  });

  it('computes average per active day', () => {
    const insights = buildWeeklyInsights([
      entry({ startedAt: '2026-09-21T09:00:00Z', durationSeconds: 3600 }),
      entry({ startedAt: '2026-09-23T09:00:00Z', durationSeconds: 1800 }),
    ]);
    // 5400 total over 2 active days
    expect(insights[0]?.averagePerDaySeconds).toBe(2700);
  });

  it('sorts weeks chronologically', () => {
    const insights = buildWeeklyInsights([
      entry({ startedAt: '2026-09-28T09:00:00Z' }), // W40
      entry({ startedAt: '2026-09-21T09:00:00Z' }), // W39
    ]);
    expect(insights.map((i) => i.isoWeek)).toEqual(['2026-W39', '2026-W40']);
  });

  it('skips invalid dates', () => {
    expect(buildWeeklyInsights([entry({ startedAt: 'garbage' })])).toEqual([]);
  });
});

describe('totalApprovedSeconds', () => {
  it('sums non-rejected finished entries', () => {
    const total = totalApprovedSeconds([
      entry({ durationSeconds: 100 }),
      entry({ status: 'pending', durationSeconds: 50 }),
      entry({ status: 'rejected', durationSeconds: 999 }),
      entry({ endedAt: null, durationSeconds: 999 }),
    ]);
    expect(total).toBe(150);
  });
});
