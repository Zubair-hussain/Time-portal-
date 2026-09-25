import React from 'react';
import { render } from '@testing-library/react';
import BinaryBackdrop from '@/components/BinaryBackdrop';

describe('BinaryBackdrop', () => {
  it('is deterministic (matches snapshot, so server and client markup agree)', () => {
    const { container } = render(<BinaryBackdrop />);
    expect(container).toMatchSnapshot();
  });

  it('renders the same digits on every render', () => {
    const a = render(<BinaryBackdrop />).container.textContent;
    const b = render(<BinaryBackdrop />).container.textContent;
    expect(a).toBe(b);
    expect(a).toMatch(/^[01]+$/);
  });

  it('is decorative', () => {
    const { container } = render(<BinaryBackdrop />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });
});
