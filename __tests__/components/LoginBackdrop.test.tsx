import React from 'react';
import { render } from '@testing-library/react';
import { gsap } from 'gsap';
import LoginBackdrop from '@/components/LoginBackdrop';

jest.mock('gsap', () => {
  const revert = jest.fn();
  return {
    gsap: {
      context: jest.fn((fn: () => void) => {
        fn();
        return { revert };
      }),
      from: jest.fn(),
      to: jest.fn(),
      __revert: revert,
    },
  };
});

const gsapMock = gsap as unknown as { from: jest.Mock; to: jest.Mock; __revert: jest.Mock };
const revert = gsapMock.__revert;

beforeEach(() => jest.clearAllMocks());

describe('LoginBackdrop', () => {
  it('matches snapshot', () => {
    const { container } = render(<LoginBackdrop />);
    expect(container).toMatchSnapshot();
  });

  it('is decorative: hidden from assistive tech and not focusable', () => {
    const { container } = render(<LoginBackdrop />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveClass('login-backdrop');
  });

  it('renders the blueprint labels', () => {
    const { container } = render(<LoginBackdrop />);
    expect(container.textContent).toContain('ZH_TIMEPORTAL');
    expect(container.textContent).toContain('INTERNAL_USE_ONLY');
    expect(container.textContent).toContain('BUILT FOR TEAMS');
  });

  it('starts the ambient animations without hiding the artwork, and cleans up on unmount', () => {
    const { unmount } = render(<LoginBackdrop />);
    expect(gsapMock.from).not.toHaveBeenCalled();
    expect(gsapMock.to).toHaveBeenCalledWith('.bp-spin', expect.objectContaining({ repeat: -1 }));
    unmount();
    expect(revert).toHaveBeenCalled();
  });

  it('skips the ambient animations when the user prefers reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes('reduce') })) as typeof window.matchMedia;
    gsapMock.to.mockClear();
    try {
      render(<LoginBackdrop />);
      expect(gsapMock.to).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });
});
