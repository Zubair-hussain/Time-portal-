import { getSupabase, __resetSupabaseForTests } from '@/lib/supabaseClient';

describe('getSupabase', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    __resetSupabaseForTests();
  });

  it('throws a helpful error when env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabase()).toThrow(/Supabase env vars missing/);
  });

  it('memoizes the client', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    expect(getSupabase()).toBe(getSupabase());
  });
});
