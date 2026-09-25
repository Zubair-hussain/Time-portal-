import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminReviewTable from '@/components/AdminReviewTable';
import type { TimeEntry } from '@/types';

const base: TimeEntry = {
  id: 'e1',
  userId: 'user-12345678',
  startedAt: '2026-09-21T09:00:00Z',
  endedAt: '2026-09-21T10:00:00Z',
  durationSeconds: 3600,
  note: 'API work',
  status: 'pending',
};

describe('AdminReviewTable', () => {
  it('shows an empty state', () => {
    render(<AdminReviewTable entries={[]} onApprove={jest.fn()} onReject={jest.fn()} />);
    expect(screen.getByText(/no entries to review/i)).toBeInTheDocument();
  });

  it('calls approve / reject handlers', async () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    render(<AdminReviewTable entries={[base]} onApprove={onApprove} onReject={onReject} />);
    await userEvent.click(screen.getByRole('button', { name: /approve entry e1/i }));
    await userEvent.click(screen.getByRole('button', { name: /reject entry e1/i }));
    expect(onApprove).toHaveBeenCalledWith('e1');
    expect(onReject).toHaveBeenCalledWith('e1');
  });

  it('disables the button matching current status', () => {
    render(
      <AdminReviewTable entries={[{ ...base, status: 'approved' }]} onApprove={jest.fn()} onReject={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: /approve entry e1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject entry e1/i })).toBeEnabled();
  });

  it('uses nameFor when provided and a placeholder for empty notes', () => {
    render(
      <AdminReviewTable
        entries={[{ ...base, note: '' }]}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        nameFor={() => 'Alice'}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('truncates user ids by default', () => {
    render(<AdminReviewTable entries={[base]} onApprove={jest.fn()} onReject={jest.fn()} />);
    expect(screen.getByText('user-123')).toBeInTheDocument();
  });
});
