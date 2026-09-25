import {
  toPortalUser,
  signIn,
  signOut,
  getCurrentAccessToken,
  adminCreateUser,
  sendConfirmationEmail,
  adminListUsers,
} from '@/lib/auth';

const mockAuth = {
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  resend: jest.fn(),
};
const mockRpc = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: mockAuth, rpc: mockRpc }),
}));

function makeToken(payload: Record<string, unknown>): string {
  const enc = (o: Record<string, unknown>) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}
const future = Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => jest.clearAllMocks());

describe('toPortalUser', () => {
  it('derives display name from email when metadata is absent', () => {
    const u = toPortalUser('1', 'zubair@x.com', makeToken({ exp: future }));
    expect(u.displayName).toBe('zubair');
    expect(u.role).toBe('member');
  });
  it('uses admin role from token', () => {
    const u = toPortalUser('1', 'a@x.com', makeToken({ exp: future, app_metadata: { role: 'admin' } }), 'Boss');
    expect(u.role).toBe('admin');
    expect(u.displayName).toBe('Boss');
  });
});

describe('signIn', () => {
  it('returns a PortalUser on success', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@x.com', user_metadata: { display_name: 'Alice' } },
        session: { access_token: makeToken({ exp: future }) },
      },
      error: null,
    });
    const user = await signIn({ email: 'a@x.com', password: 'pw' });
    expect(user).toMatchObject({ id: 'u1', displayName: 'Alice', role: 'member' });
  });

  it('throws on Supabase error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Invalid login' } });
    await expect(signIn({ email: 'a@x.com', password: 'bad' })).rejects.toThrow('Invalid login');
  });

  it('throws when no session is returned', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    await expect(signIn({ email: 'a@x.com', password: 'pw' })).rejects.toThrow(/no session/);
  });
});

describe('signOut', () => {
  it('resolves when Supabase succeeds', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });
  it('throws on error', async () => {
    mockAuth.signOut.mockResolvedValue({ error: { message: 'boom' } });
    await expect(signOut()).rejects.toThrow('boom');
  });
});

describe('getCurrentAccessToken', () => {
  it('returns the token or null', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    expect(await getCurrentAccessToken()).toBe('tok');
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getCurrentAccessToken()).toBeNull();
  });
});

describe('adminCreateUser', () => {
  const input = { email: 'n@x.com', password: 'Temp12345', displayName: 'New', role: 'member' as const };

  it('calls the admin_create_user rpc with prefixed params', async () => {
    mockRpc.mockResolvedValue({ data: 'uuid-1', error: null });
    await expect(adminCreateUser(input)).resolves.toEqual({ id: 'uuid-1' });
    expect(mockRpc).toHaveBeenCalledWith('admin_create_user', {
      p_email: 'n@x.com',
      p_password: 'Temp12345',
      p_display_name: 'New',
      p_role: 'member',
      p_require_confirmation: false,
    });
  });

  it('passes requireConfirmation through to the rpc', async () => {
    mockRpc.mockResolvedValue({ data: 'uuid-2', error: null });
    await adminCreateUser({ ...input, requireConfirmation: true });
    expect(mockRpc).toHaveBeenCalledWith(
      'admin_create_user',
      expect.objectContaining({ p_require_confirmation: true }),
    );
  });

  it('propagates database errors', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Only admins can create users' } });
    await expect(adminCreateUser(input)).rejects.toThrow('Only admins can create users');
  });

  it('explains the one-time setup when the function is missing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(adminCreateUser(input)).rejects.toThrow(/admin-create-user.sql/);
  });
});

describe('sendConfirmationEmail', () => {
  it('resends the signup confirmation for the lowercased, trimmed email', async () => {
    mockAuth.resend.mockResolvedValue({ error: null });
    await expect(sendConfirmationEmail('  New@X.com ')).resolves.toBeUndefined();
    expect(mockAuth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'new@x.com' });
  });
  it('throws the provider error (e.g. SMTP not configured)', async () => {
    mockAuth.resend.mockResolvedValue({ error: { message: 'Error sending confirmation email' } });
    await expect(sendConfirmationEmail('a@x.com')).rejects.toThrow('Error sending confirmation email');
  });
});

describe('adminListUsers', () => {
  it('maps rows and coerces unknown roles to member', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: '1', email: 'a@x.com', display_name: 'Ann', role: 'admin', email_confirmed: true, created_at: '2026-09-01T00:00:00Z' },
        { id: '2', email: 'b@x.com', display_name: null, role: 'weird', email_confirmed: false, created_at: null },
      ],
      error: null,
    });
    const users = await adminListUsers();
    expect(mockRpc).toHaveBeenCalledWith('admin_list_users');
    expect(users[0]).toEqual({ id: '1', email: 'a@x.com', displayName: 'Ann', role: 'admin', emailConfirmed: true, createdAt: '2026-09-01T00:00:00Z' });
    expect(users[1]).toMatchObject({ displayName: '', role: 'member', emailConfirmed: false });
  });
  it('returns an empty list for null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(adminListUsers()).resolves.toEqual([]);
  });
  it('explains the setup step when the function is missing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(adminListUsers()).rejects.toThrow(/admin-create-user.sql/);
  });
  it('throws other errors as-is', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Only admins can list users' } });
    await expect(adminListUsers()).rejects.toThrow('Only admins can list users');
  });
});
