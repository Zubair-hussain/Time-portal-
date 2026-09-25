import React from 'react';
import { render, screen } from '@testing-library/react';
import WeeklyInsightsChart from '@/components/WeeklyInsightsChart';

// Recharts' ResponsiveContainer needs real layout; stub it for deterministic output.
jest.mock('recharts', () => {
  const Actual = jest.requireActual('recharts');
  return {
    ...Actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div data-testid="responsive">{React.cloneElement(children, { width: 600, height: 260 })}</div>
    ),
  };
});

describe('WeeklyInsightsChart', () => {
  it('shows an empty state with no data', () => {
    const { container } = render(<WeeklyInsightsChart insights={[]} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders the chart when data exists', () => {
    render(
      <WeeklyInsightsChart
        insights={[
          {
            isoWeek: '2026-W39',
            totalSeconds: 7200,
            entryCount: 2,
            averagePerDaySeconds: 3600,
            perWeekdaySeconds: [3600, 3600, 0, 0, 0, 0, 0],
          },
        ]}
      />,
    );
    expect(screen.getByText('Weekly hours')).toBeInTheDocument();
    expect(screen.getByTestId('responsive')).toBeInTheDocument();
  });
});
