import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nav from '@/components/Nav';
import { useAuth } from '@/context/AuthContext';

jest.mock('@/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('Nav', () => {
  it('renders nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, signOut: jest.fn() });
    const { container } = render(<Nav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides the Admin link for members', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'm@x.com', role: 'member', displayName: 'Mem' },
      signOut: jest.fn(),
    });
    render(<Nav />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('shows the Admin link for admins and signs out', async () => {
    const signOut = jest.fn();
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'a@x.com', role: 'admin', displayName: 'Boss' },
      signOut,
    });
    const { container } = render(<Nav />);
    expect(container).toMatchSnapshot();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin').closest('a')).toHaveAttribute('href', '/time/Portal/admIn/');
    expect(container.innerHTML).not.toContain('href="/admin/');
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
