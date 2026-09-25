import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const unsubscribe = jest.fn();
let authCallback: ((e: string, s: unknown) => void) | null = null;
const getSession = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession,
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  }),
}));

const doSignIn = jest.fn();
const doSignOut = jest.fn();
jest.mock('@/lib/auth', () => ({
  signIn: (...a: unknown[]) => doSignIn(...a),
  signOut: (...a: unknown[]) => doSignOut(...a),
  toPortalUser: (id: string, email: string) => ({ id, email, role: 'member', displayName: email }),
}));

function Probe() {
  const { user, loading, error, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="state">{loading ? 'loading' : user ? user.email : 'anon'}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button onClick={() => signIn('a@x.com', 'pw').catch(() => undefined)}>in</button>
      <button onClick={() => void signOut()}>out</button>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({ data: { session: null } });
});

describe('AuthProvider', () => {
  it('starts loading then resolves anonymous', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
  });

  it('hydrates from an existing session', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: '1', email: 'me@x.com', user_metadata: {} } } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('me@x.com'));
  });

  it('reacts to auth state changes', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
    act(() => authCallback?.('SIGNED_IN', { access_token: 't', user: { id: '2', email: 'x@x.com', user_metadata: {} } }));
    expect(screen.getByTestId('state')).toHaveTextContent('x@x.com');
    act(() => authCallback?.('SIGNED_OUT', null));
    expect(screen.getByTestId('state')).toHaveTextContent('anon');
  });

  it('signs in and surfaces errors', async () => {
    doSignIn.mockRejectedValueOnce(new Error('Bad creds'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
    await act(async () => screen.getByText('in').click());
    expect(screen.getByTestId('error')).toHaveTextContent('Bad creds');

    doSignIn.mockResolvedValueOnce({ id: '1', email: 'ok@x.com', role: 'member', displayName: 'ok' });
    await act(async () => screen.getByText('in').click());
    expect(screen.getByTestId('state')).toHaveTextContent('ok@x.com');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('signs out and unsubscribes on unmount', async () => {
    doSignOut.mockResolvedValue(undefined);
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
    await act(async () => screen.getByText('out').click());
    expect(doSignOut).toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('throws when useAuth is used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/within <AuthProvider>/);
    spy.mockRestore();
  });
});
