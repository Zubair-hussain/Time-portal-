import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimerCard from '@/components/TimerCard';

describe('TimerCard', () => {
  afterEach(() => jest.useRealTimers());

  it('matches snapshot when idle', () => {
    const { container } = render(<TimerCard runningSince={null} onStart={jest.fn()} onStop={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('starts with the typed note', async () => {
    const onStart = jest.fn();
    render(<TimerCard runningSince={null} onStart={onStart} onStop={jest.fn()} />);
    await userEvent.type(screen.getByLabelText('Session note'), 'deep work');
    await userEvent.click(screen.getByRole('button', { name: /start timer/i }));
    expect(onStart).toHaveBeenCalledWith('deep work');
  });

  it('ticks while running and can be stopped', async () => {
    jest.useFakeTimers();
    const now = new Date('2026-09-25T10:00:00Z');
    jest.setSystemTime(now);
    const onStop = jest.fn();
    render(
      <TimerCard runningSince={new Date(now.getTime() - 61_000).toISOString()} onStart={jest.fn()} onStop={onStop} />,
    );
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('0:01:01');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('0:01:03');
    expect(screen.getByText('Live')).toBeInTheDocument();
    screen.getByRole('button', { name: /stop/i }).click();
    expect(onStop).toHaveBeenCalled();
  });

  it('disables actions when busy', () => {
    render(<TimerCard runningSince={null} onStart={jest.fn()} onStop={jest.fn()} busy />);
    expect(screen.getByRole('button', { name: /start timer/i })).toBeDisabled();
  });
});
