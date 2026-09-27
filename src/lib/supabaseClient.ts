import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Single browser Supabase client. Uses the PUBLIC anon key only.
 * All privileged operations are gated by Row Level Security in the database.
 */
let cached: SupabaseClient | null = null;

// Internal tool: the project URL + anon key are hardcoded so every build (Cloudflare
// Git builds included) works without dashboard env vars. The anon key is public by
// design; RLS enforces access. Env vars, when set, still take precedence.
const SUPABASE_URL = 'https://tbjivibugttwwhcfswde.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaml2aWJ1Z3R0d3doY2Zzd2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjk0NjEsImV4cCI6MjEwNTkwNTQ2MX0.VJCKQVvWwpexpYRCc5gElpX-unLkb9FCmAyM2A_IoAk';

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_ANON_KEY;

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
