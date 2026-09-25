import React from 'react';
import { render, screen } from '@testing-library/react';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => replace.mockClear());

describe('RequireAuth', () => {
  it('shows loading state', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<RequireAuth>secret</RequireAuth>);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users to /', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<RequireAuth>secret</RequireAuth>);
    expect(replace).toHaveBeenCalledWith('/');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders children for signed-in members', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'member' }, loading: false });
    render(<RequireAuth>secret</RequireAuth>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('blocks members from admin-only pages', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'member' }, loading: false });
    render(<RequireAuth adminOnly>secret</RequireAuth>);
    expect(replace).toHaveBeenCalledWith('/dashboard/');
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('allows admins on admin-only pages', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    render(<RequireAuth adminOnly>secret</RequireAuth>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
