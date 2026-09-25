import React from 'react';
import { render, screen } from '@testing-library/react';
import AwardBanner from '@/components/AwardBanner';

describe('AwardBanner', () => {
  it('matches snapshot with a winner', () => {
    const { container } = render(
      <AwardBanner award={{ month: '2026-09', userId: 'u1', displayName: 'Alice', totalSeconds: 7200 }} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('shows winner details', () => {
    render(<AwardBanner award={{ month: '2026-09', userId: 'u1', displayName: 'Alice', totalSeconds: 7200 }} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('2h approved')).toBeInTheDocument();
  });

  it('matches snapshot with no winner', () => {
    const { container } = render(<AwardBanner award={null} />);
    expect(container).toMatchSnapshot();
  });
});
