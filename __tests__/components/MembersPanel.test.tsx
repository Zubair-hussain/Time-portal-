import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MembersPanel from '@/components/MembersPanel';
import type { AdminUserRow } from '@/lib/auth';

const users: AdminUserRow[] = [
  { id: '1', email: 'ann@x.com', displayName: 'Ann', role: 'admin', emailConfirmed: true, createdAt: '2026-09-01' },
  { id: '2', email: 'bob@x.com', displayName: '', role: 'member', emailConfirmed: false, createdAt: '2026-09-02' },
];

describe('MembersPanel', () => {
  it('matches snapshot', () => {
    const { container } = render(<MembersPanel users={users} onResend={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('shows names (falling back to the email prefix), roles and confirmation state', () => {
    render(<MembersPanel users={users} onResend={jest.fn()} />);
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('unconfirmed')).toBeInTheDocument();
  });

  it('offers Resend only for unconfirmed users', () => {
    render(<MembersPanel users={users} onResend={jest.fn()} />);
    expect(screen.getAllByRole('button', { name: /resend confirmation/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /resend confirmation to bob@x.com/i })).toBeInTheDocument();
  });

  it('resends and reports success', async () => {
    const onResend = jest.fn().mockResolvedValue(undefined);
    render(<MembersPanel users={users} onResend={onResend} />);
    await userEvent.click(screen.getByRole('button', { name: /resend confirmation/i }));
    expect(onResend).toHaveBeenCalledWith('bob@x.com');
    expect(await screen.findByRole('status')).toHaveTextContent('Confirmation email sent to bob@x.com.');
  });

  it('reports a failed resend (e.g. SMTP not configured)', async () => {
    const onResend = jest.fn().mockRejectedValue(new Error('Error sending confirmation email'));
    render(<MembersPanel users={users} onResend={onResend} />);
    await userEvent.click(screen.getByRole('button', { name: /resend confirmation/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error sending confirmation email');
  });

  it('shows the load error instead of an empty message', () => {
    render(<MembersPanel users={[]} onResend={jest.fn()} loadError="Setup missing: run supabase/admin-create-user.sql" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/setup missing/i);
    expect(screen.queryByText(/no members yet/i)).not.toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<MembersPanel users={[]} onResend={jest.fn()} />);
    expect(screen.getByText(/no members yet/i)).toBeInTheDocument();
  });
});
