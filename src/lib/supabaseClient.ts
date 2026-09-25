import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Single browser Supabase client. Uses the PUBLIC anon key only.
 * All privileged operations are gated by Row Level Security in the database.
 */
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
    );
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

/** Test seam: reset the memoized client. */
export function __resetSupabaseForTests(): void {
  cached = null;
}
