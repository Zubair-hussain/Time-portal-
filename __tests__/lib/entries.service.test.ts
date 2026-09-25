import { startEntry, stopEntry, listMyEntries, listAllEntries, reviewEntry } from '@/lib/entries';

/** A tiny chainable Supabase query-builder mock. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {};
  const chain = () => builder;
  builder.insert = jest.fn(chain);
  builder.update = jest.fn(chain);
  builder.select = jest.fn(chain);
  builder.eq = jest.fn(chain);
  builder.order = jest.fn(() => Promise.resolve(result));
  builder.single = jest.fn(() => Promise.resolve(result));
  // Make the builder awaitable (Supabase query builders are thenable), so calls
  // that await the chain directly (e.g. reviewEntry's update().eq()) resolve too.
  builder.then = jest.fn((onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled));
  return builder;
}

let currentResult: { data: unknown; error: unknown };
const from = jest.fn(() => makeBuilder(currentResult));

jest.mock('@/lib/supabaseClient', () => ({ getSupabase: () => ({ from }) }));

const row = {
  id: 'e1',
  user_id: 'u1',
  started_at: '2026-09-25T10:00:00Z',
  ended_at: '2026-09-25T11:00:00Z',
  duration_seconds: 3600,
  note: 'n',
  status: 'pending',
};

beforeEach(() => {
  jest.clearAllMocks();
  currentResult = { data: row, error: null };
});

describe('entries service', () => {
  it('startEntry returns a mapped entry', async () => {
    const e = await startEntry('u1', 'note');
    expect(e.id).toBe('e1');
    expect(from).toHaveBeenCalledWith('time_entries');
  });

  it('startEntry throws on error', async () => {
    currentResult = { data: null, error: { message: 'insert failed' } };
    await expect(startEntry('u1')).rejects.toThrow('insert failed');
  });

  it('stopEntry reads then updates', async () => {
    const e = await stopEntry('e1');
    expect(e.endedAt).not.toBeNull();
  });

  it('stopEntry throws when read fails', async () => {
    currentResult = { data: null, error: { message: 'not found' } };
    await expect(stopEntry('e1')).rejects.toThrow('not found');
  });

  it('listMyEntries maps rows', async () => {
    currentResult = { data: [row, row], error: null };
    const list = await listMyEntries('u1');
    expect(list).toHaveLength(2);
  });

  it('listMyEntries throws on error', async () => {
    currentResult = { data: null, error: { message: 'denied' } };
    await expect(listMyEntries('u1')).rejects.toThrow('denied');
  });

  it('listAllEntries maps rows', async () => {
    currentResult = { data: [row], error: null };
    expect(await listAllEntries()).toHaveLength(1);
  });

  it('listAllEntries throws on error', async () => {
    currentResult = { data: null, error: { message: 'denied' } };
    await expect(listAllEntries()).rejects.toThrow('denied');
  });

  it('reviewEntry resolves on success', async () => {
    currentResult = { data: null, error: null };
    await expect(reviewEntry('e1', 'approved')).resolves.toBeUndefined();
  });

  it('reviewEntry throws on error', async () => {
    currentResult = { data: null, error: { message: 'nope' } };
    await expect(reviewEntry('e1', 'rejected')).rejects.toThrow('nope');
  });
});
