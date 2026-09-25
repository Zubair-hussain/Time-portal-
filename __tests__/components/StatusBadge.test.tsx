import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it.each(['pending', 'approved', 'rejected'] as const)('renders %s', (status) => {
    const { container } = render(<StatusBadge status={status} />);
    expect(container).toMatchSnapshot();
    expect(container.firstChild).toHaveClass(`badge-${status}`);
  });

  it('shows a capitalised label', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
