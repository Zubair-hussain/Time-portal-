import { filterEntries, countByStatus, suggest } from '@/lib/adminFilter';
import type { TimeEntry } from '@/types';

const make = (id: string, userId: string, note: string, status: TimeEntry['status']): TimeEntry => ({
  id,
  userId,
  startedAt: '2026-09-21T09:00:00Z',
  endedAt: '2026-09-21T10:00:00Z',
  durationSeconds: 3600,
  note,
  status,
});

const entries = [
  make('1', 'u1', 'API integration', 'pending'),
  make('2', 'u2', 'Design review', 'approved'),
  make('3', 'u1', 'Bug fixing', 'rejected'),
  make('4', 'u3', 'api docs', 'approved'),
];
const names: Record<string, string> = { u1: 'Ayesha Khan', u2: 'Bilal Ahmed', u3: 'Zubair' };
const nameFor = (id: string) => names[id] ?? id;

describe('filterEntries', () => {
  it('returns everything for an empty filter', () => {
    expect(filterEntries(entries, { query: '', status: 'all' }, nameFor)).toHaveLength(4);
  });
  it('filters by status', () => {
    expect(filterEntries(entries, { query: '', status: 'approved' }, nameFor).map((e) => e.id)).toEqual(['2', '4']);
  });
  it('matches member name and note, case-insensitively', () => {
    expect(filterEntries(entries, { query: 'AYESHA', status: 'all' }, nameFor).map((e) => e.id)).toEqual(['1', '3']);
    expect(filterEntries(entries, { query: 'api', status: 'all' }, nameFor).map((e) => e.id)).toEqual(['1', '4']);
  });
  it('requires every word to match (AND)', () => {
    expect(filterEntries(entries, { query: 'ayesha bug', status: 'all' }, nameFor).map((e) => e.id)).toEqual(['3']);
    expect(filterEntries(entries, { query: 'ayesha zzz', status: 'all' }, nameFor)).toEqual([]);
  });
  it('combines status and query', () => {
    expect(filterEntries(entries, { query: 'api', status: 'approved' }, nameFor).map((e) => e.id)).toEqual(['4']);
  });
  it('matches the status word itself', () => {
    expect(filterEntries(entries, { query: 'rejected', status: 'all' }, nameFor).map((e) => e.id)).toEqual(['3']);
  });
  it('falls back to the user id when no name resolver is given', () => {
    expect(filterEntries(entries, { query: 'u2', status: 'all' }).map((e) => e.id)).toEqual(['2']);
  });
});

describe('countByStatus', () => {
  it('counts each status and the total', () => {
    expect(countByStatus(entries)).toEqual({ all: 4, pending: 1, approved: 2, rejected: 1 });
  });
  it('is all zeros for no entries', () => {
    expect(countByStatus([])).toEqual({ all: 0, pending: 0, approved: 0, rejected: 0 });
  });
});

describe('suggest', () => {
  it('returns nothing for an empty query', () => {
    expect(suggest(entries, '  ', nameFor)).toEqual([]);
  });
  it('suggests distinct names and notes containing the query', () => {
    expect(suggest(entries, 'a', nameFor)).toEqual(expect.arrayContaining(['Ayesha Khan', 'Bilal Ahmed']));
  });
  it('does not suggest an exact match of what was typed', () => {
    expect(suggest(entries, 'zubair', nameFor)).toEqual([]);
  });
  it('respects the limit', () => {
    expect(suggest(entries, 'a', nameFor, 2)).toHaveLength(2);
  });
});
