import { rowToEntry } from '@/lib/entries';

describe('rowToEntry', () => {
  it('maps a completed row', () => {
    const e = rowToEntry({
      id: '1',
      user_id: 'u1',
      started_at: '2026-09-21T09:00:00Z',
      ended_at: '2026-09-21T10:00:00Z',
      duration_seconds: 3600,
      note: 'work',
      status: 'approved',
    });
    expect(e).toEqual({
      id: '1',
      userId: 'u1',
      startedAt: '2026-09-21T09:00:00Z',
      endedAt: '2026-09-21T10:00:00Z',
      durationSeconds: 3600,
      note: 'work',
      status: 'approved',
    });
  });

  it('derives duration when the column is null', () => {
    const e = rowToEntry({
      id: '2',
      user_id: 'u1',
      started_at: '2026-09-21T09:00:00Z',
      ended_at: '2026-09-21T09:30:00Z',
      duration_seconds: null,
      note: null,
      status: 'pending',
    });
    expect(e.durationSeconds).toBe(1800);
    expect(e.note).toBe('');
  });

  it('reports 0 duration for running entries', () => {
    const e = rowToEntry({
      id: '3',
      user_id: 'u1',
      started_at: '2026-09-21T09:00:00Z',
      ended_at: null,
      duration_seconds: null,
      note: '',
      status: 'pending',
    });
    expect(e.durationSeconds).toBe(0);
    expect(e.endedAt).toBeNull();
  });
});
