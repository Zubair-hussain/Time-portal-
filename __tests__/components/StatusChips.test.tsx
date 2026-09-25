import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusChips from '@/components/StatusChips';

const counts = { all: 10, pending: 4, approved: 5, rejected: 1 };

describe('StatusChips', () => {
  it('matches snapshot', () => {
    const { container } = render(<StatusChips value="all" counts={counts} onChange={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('shows each label with its count', () => {
    render(<StatusChips value="all" counts={counts} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /pending 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approved 5/i })).toBeInTheDocument();
  });

  it('marks the active chip as pressed', () => {
    render(<StatusChips value="approved" counts={counts} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /approved/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /pending/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen filter', async () => {
    const onChange = jest.fn();
    render(<StatusChips value="all" counts={counts} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /rejected/i }));
    expect(onChange).toHaveBeenCalledWith('rejected');
  });
});
