import { computeMonthlyAward, monthlyLeaderboard } from '@/lib/awards';
import type { PortalUser, TimeEntry } from '@/types';

const users: PortalUser[] = [
  { id: 'u1', email: 'a@x.com', role: 'member', displayName: 'Alice' },
  { id: 'u2', email: 'b@x.com', role: 'member', displayName: 'Bob' },
];

function entry(userId: string, seconds: number, over: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: `${userId}-${seconds}-${Math.random()}`,
    userId,
    startedAt: '2026-09-10T09:00:00Z',
    endedAt: '2026-09-10T10:00:00Z',
    durationSeconds: seconds,
    note: '',
    status: 'approved',
    ...over,
  };
}

describe('computeMonthlyAward', () => {
  it('picks the user with the most approved seconds', () => {
    const award = computeMonthlyAward('2026-09', [entry('u1', 1000), entry('u2', 5000), entry('u1', 2000)], users);
    expect(award).toMatchObject({ userId: 'u2', displayName: 'Bob', totalSeconds: 5000 });
  });

  it('ignores pending and rejected entries', () => {
    const award = computeMonthlyAward(
      '2026-09',
      [entry('u1', 9999, { status: 'pending' }), entry('u2', 100, { status: 'rejected' }), entry('u1', 10)],
      users,
    );
    expect(award?.userId).toBe('u1');
    expect(award?.totalSeconds).toBe(10);
  });

  it('ignores other months', () => {
    const award = computeMonthlyAward('2026-08', [entry('u1', 1000)], users);
    expect(award).toBeNull();
  });

  it('returns null with no qualifying activity', () => {
    expect(computeMonthlyAward('2026-09', [], users)).toBeNull();
  });

  it('falls back to "Unknown" for unmapped users', () => {
    const award = computeMonthlyAward('2026-09', [entry('ghost', 100)], users);
    expect(award?.displayName).toBe('Unknown');
  });
});

describe('monthlyLeaderboard', () => {
  it('ranks descending by approved seconds', () => {
    const board = monthlyLeaderboard('2026-09', [entry('u1', 100), entry('u2', 300), entry('u1', 250)], users);
    expect(board.map((b) => b.userId)).toEqual(['u1', 'u2']);
    expect(board[0]?.totalSeconds).toBe(350);
  });
});
