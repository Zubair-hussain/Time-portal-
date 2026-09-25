import React from 'react';
import { render, screen } from '@testing-library/react';
import { gsap } from 'gsap';
import RetroComputer from '@/components/RetroComputer';

jest.mock('gsap', () => {
  const kill = jest.fn();
  const timeline = jest.fn(() => {
    const tl: Record<string, jest.Mock> = {};
    tl.set = jest.fn(() => tl);
    tl.to = jest.fn(() => tl);
    tl.kill = kill;
    return tl;
  });
  return {
    gsap: {
      context: jest.fn((fn: () => void) => {
        fn();
        return { revert: jest.fn() };
      }),
      from: jest.fn(),
      to: jest.fn(),
      fromTo: jest.fn(),
      set: jest.fn(),
      timeline,
      __kill: kill,
    },
  };
});

const gsapMock = gsap as unknown as { timeline: jest.Mock; __kill: jest.Mock };
const kill = gsapMock.__kill;

beforeEach(() => jest.clearAllMocks());

describe('RetroComputer', () => {
  it('matches snapshot when idle', () => {
    const { container } = render(<RetroComputer />);
    expect(container).toMatchSnapshot();
  });

  it('exposes an accessible label and idle READY text', () => {
    render(<RetroComputer />);
    expect(screen.getByRole('img', { name: /retro computer/i })).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('does not start the loading timeline while idle', () => {
    render(<RetroComputer loading={false} />);
    expect(gsapMock.timeline).not.toHaveBeenCalled();
  });

  it('plays the loading timeline when loading, and stops it on unmount', () => {
    const { unmount } = render(<RetroComputer loading />);
    expect(gsapMock.timeline).toHaveBeenCalledTimes(1);
    expect(screen.getByText('SIGNING IN…')).toBeInTheDocument();
    unmount();
    expect(kill).toHaveBeenCalled();
  });

  it('restarts the timeline when loading flips off then on', () => {
    const { rerender } = render(<RetroComputer loading />);
    rerender(<RetroComputer loading={false} />);
    rerender(<RetroComputer loading />);
    expect(gsapMock.timeline).toHaveBeenCalledTimes(2);
  });

  it('respects the size prop', () => {
    render(<RetroComputer size={200} />);
    expect(screen.getByRole('img', { name: /retro computer/i })).toHaveAttribute('width', '200');
  });
});
