import React from 'react';
import { render, screen } from '@testing-library/react';
import ZHLogo from '@/components/ZHLogo';

describe('ZHLogo', () => {
  it('matches snapshot (icon only)', () => {
    const { container } = render(<ZHLogo />);
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot (with wordmark)', () => {
    const { container } = render(<ZHLogo withWordmark size={40} />);
    expect(container).toMatchSnapshot();
  });

  it('exposes an accessible label', () => {
    render(<ZHLogo />);
    expect(screen.getByRole('img', { name: /ZH/i })).toBeInTheDocument();
  });

  it('uses the portfolio brand colours: off-white "ZH" and a crimson "."', () => {
    const { container } = render(<ZHLogo />);
    const fills = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['var(--brand-ink, #f5f4f0)', 'var(--brand-solid, #c8141e)']);
  });

  it('labels the lockup and shows the product name with the wordmark', () => {
    render(<ZHLogo withWordmark />);
    expect(screen.getByLabelText('ZH. Time Portal')).toBeInTheDocument();
    expect(screen.getByText('Time Portal')).toBeInTheDocument();
  });

  it('scales from the portfolio header size', () => {
    const { container } = render(<ZHLogo size={28} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '22');
    expect(svg).toHaveAttribute('width', '31');
  });
});
