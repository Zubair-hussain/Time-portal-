import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandSearch from '@/components/CommandSearch';

function Harness({ suggestions = [] as string[] }) {
  const [v, setV] = useState('');
  return <CommandSearch value={v} onChange={setV} suggestions={suggestions} />;
}

describe('CommandSearch', () => {
  it('matches snapshot', () => {
    const { container } = render(<CommandSearch value="" onChange={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('reports typing', async () => {
    const onChange = jest.fn();
    render(<CommandSearch value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('combobox', { name: /search entries/i }), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('shows a clear button only when there is text, and clears', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<CommandSearch value="" onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    rerender(<CommandSearch value="abc" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('lists suggestions on focus and picks one without losing the click', async () => {
    render(<Harness suggestions={['Ayesha Khan', 'API docs']} />);
    const input = screen.getByRole('combobox');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ayesha Khan' }));
    expect(input).toHaveValue('Ayesha Khan');
  });

  it('hides the list on blur', async () => {
    render(<Harness suggestions={['x']} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
