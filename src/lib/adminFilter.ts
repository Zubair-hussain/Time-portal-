import type { EntryStatus, TimeEntry } from '@/types';

export type StatusFilter = 'all' | EntryStatus;

export interface EntryFilter {
  query: string;
  status: StatusFilter;
}

/**
 * Filter review entries by status and a free-text query. Every whitespace-separated
 * word in the query must match (AND) against the member name, note or status.
 */
export function filterEntries(
  entries: TimeEntry[],
  filter: EntryFilter,
  nameFor: (userId: string) => string = (id) => id,
): TimeEntry[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (filter.status !== 'all' && e.status !== filter.status) return false;
    if (words.length === 0) return true;
    const haystack = `${nameFor(e.userId)} ${e.note} ${e.status}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export function countByStatus(entries: TimeEntry[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: entries.length, pending: 0, approved: 0, rejected: 0 };
  for (const e of entries) counts[e.status] += 1;
  return counts;
}

/** Autocomplete suggestions: distinct member names and notes that contain the query. */
export function suggest(entries: TimeEntry[], query: string, nameFor: (userId: string) => string, limit = 5): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  for (const e of entries) {
    for (const candidate of [nameFor(e.userId), e.note]) {
      const c = candidate.trim();
      if (c && c.toLowerCase().includes(q) && c.toLowerCase() !== q) seen.add(c);
      if (seen.size >= limit) return [...seen];
    }
  }
  return [...seen];
}
