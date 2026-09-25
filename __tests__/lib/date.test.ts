import { isoWeekKey, monthKey, weekdayIndex, WEEKDAY_LABELS } from '@/lib/date';

describe('date utilities', () => {
  it('computes ISO week key', () => {
    // 2026-09-25 is a Friday in ISO week 39.
    expect(isoWeekKey(new Date('2026-09-25T12:00:00Z'))).toBe('2026-W39');
  });

  it('handles year-boundary weeks', () => {
    // 2027-01-01 is a Friday, still ISO week 53 of 2026.
    expect(isoWeekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
  });

  it('computes month key with zero padding', () => {
    expect(monthKey(new Date('2026-03-05T00:00:00Z'))).toBe('2026-03');
    expect(monthKey(new Date('2026-11-30T00:00:00Z'))).toBe('2026-11');
  });

  it('maps weekday with Monday=0', () => {
    expect(weekdayIndex(new Date('2026-09-21T00:00:00Z'))).toBe(0); // Monday
    expect(weekdayIndex(new Date('2026-09-27T00:00:00Z'))).toBe(6); // Sunday
  });

  it('exposes 7 weekday labels', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS[0]).toBe('Mon');
  });
});
