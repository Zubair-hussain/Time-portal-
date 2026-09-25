import type { EntryStatus, TimeEntry } from '@/types';
import { getSupabase } from '@/lib/supabaseClient';
import { durationBetween, normalizeSeconds } from '@/lib/time';
import { sanitizeNote } from '@/lib/validation';

/** Shape of a row in the `time_entries` table. */
interface EntryRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
  status: EntryStatus;
}

export function rowToEntry(row: EntryRow): TimeEntry {
  const duration =
    row.duration_seconds != null
      ? normalizeSeconds(row.duration_seconds)
      : row.ended_at
        ? durationBetween(row.started_at, row.ended_at)
        : 0;
  return {
    id: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: duration,
    note: row.note ?? '',
    status: row.status,
  };
}

const TABLE = 'time_entries';

export async function startEntry(userId: string, note = ''): Promise<TimeEntry> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, started_at: new Date().toISOString(), note: sanitizeNote(note), status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToEntry(data as EntryRow);
}

export async function stopEntry(entryId: string): Promise<TimeEntry> {
  const supabase = getSupabase();
  const endedAt = new Date().toISOString();
  const { data: current, error: readErr } = await supabase.from(TABLE).select().eq('id', entryId).single();
  if (readErr) throw new Error(readErr.message);
  const duration = durationBetween((current as EntryRow).started_at, endedAt);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ended_at: endedAt, duration_seconds: duration })
    .eq('id', entryId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToEntry(data as EntryRow);
}

export async function listMyEntries(userId: string): Promise<TimeEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select()
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as EntryRow[]).map(rowToEntry);
}

export async function listAllEntries(): Promise<TimeEntry[]> {
  // RLS ensures only admins can read all rows.
  const supabase = getSupabase();
  const { data, error } = await supabase.from(TABLE).select().order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as EntryRow[]).map(rowToEntry);
}

export async function reviewEntry(entryId: string, status: Extract<EntryStatus, 'approved' | 'rejected'>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', entryId);
  if (error) throw new Error(error.message);
}
