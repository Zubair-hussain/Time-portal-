import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddUserForm from '@/components/AddUserForm';
import type { EmailVerdict } from '@/lib/emailCheck';

const ok = jest.fn(async (email: string): Promise<EmailVerdict> => ({ status: 'valid', email: email.trim().toLowerCase() }));

beforeEach(() => ok.mockClear());

describe('AddUserForm', () => {
  it('renders with a prefilled temporary password', () => {
    render(<AddUserForm onCreate={jest.fn()} verify={ok} />);
    expect(screen.getByRole('form', { name: /register user/i })).toBeInTheDocument();
    expect((screen.getByLabelText('Temporary password') as HTMLInputElement).value.length).toBeGreaterThan(6);
  });

  it('blocks creation when the email is invalid and shows why', async () => {
    const onCreate = jest.fn();
    const bad = jest.fn().mockResolvedValue({ status: 'invalid', email: 'x@nope.com', reason: 'nope.com cannot receive email.' });
    render(<AddUserForm onCreate={onCreate} verify={bad} />);
    await userEvent.type(screen.getByLabelText('Email'), 'x@nope.com');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nope.com cannot receive email.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('verifies on blur and shows a success tick', async () => {
    render(<AddUserForm onCreate={jest.fn()} verify={ok} />);
    await userEvent.type(screen.getByLabelText('Email'), 'new@company.com');
    await userEvent.tab();
    expect(await screen.findByText(/email looks valid/i)).toBeInTheDocument();
    expect(ok).toHaveBeenCalledWith('new@company.com');
  });

  it('offers a typo suggestion that fills the field', async () => {
    const typo = jest.fn().mockResolvedValue({
      status: 'invalid',
      email: 'sam@gmial.com',
      reason: 'gmial.com cannot receive email.',
      suggestion: 'sam@gmail.com',
    });
    render(<AddUserForm onCreate={jest.fn()} verify={typo} />);
    await userEvent.type(screen.getByLabelText('Email'), 'sam@gmial.com');
    await userEvent.tab();
    await userEvent.click(await screen.findByRole('button', { name: /did you mean sam@gmail\.com/i }));
    expect(screen.getByLabelText('Email')).toHaveValue('sam@gmail.com');
  });

  it('warns instead of showing a tick when a valid domain looks like a typo', async () => {
    // gmial.com is a real, mail-capable domain, so DNS passes but we still hint.
    const lookalike = jest.fn().mockResolvedValue({ status: 'valid', email: 'sam@gmial.com', suggestion: 'sam@gmail.com' });
    render(<AddUserForm onCreate={jest.fn()} verify={lookalike} />);
    await userEvent.type(screen.getByLabelText('Email'), 'sam@gmial.com');
    await userEvent.tab();
    expect(await screen.findByText(/check the spelling/i)).toBeInTheDocument();
    expect(screen.queryByText(/email looks valid/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /did you mean sam@gmail\.com/i })).toBeInTheDocument();
  });

  it('does not block when the domain check could not run', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: '1' });
    const unknown = jest.fn().mockResolvedValue({ status: 'unknown', email: 'a@example.com', reason: 'Could not check the domain right now.' });
    render(<AddUserForm onCreate={onCreate} verify={unknown} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('User created');
    expect(onCreate).toHaveBeenCalled();
  });

  it('rejects short passwords', async () => {
    const onCreate = jest.fn();
    render(<AddUserForm onCreate={onCreate} verify={ok} />);
    await userEvent.type(screen.getByLabelText('Email'), 'new@company.com');
    await userEvent.clear(screen.getByLabelText('Temporary password'));
    await userEvent.type(screen.getByLabelText('Temporary password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8/i);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates the user with the verified, lowercased email and shows the credentials', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: '1' });
    render(<AddUserForm onCreate={onCreate} verify={ok} />);
    await userEvent.type(screen.getByLabelText('Email'), 'New@Company.com');
    await userEvent.type(screen.getByLabelText('Display name'), 'New Person');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'admin');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@company.com', displayName: 'New Person', role: 'admin' }),
    );
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('User created');
    expect(status).toHaveTextContent('new@company.com');
  });

  it('shows the error when creation fails', async () => {
    const onCreate = jest.fn().mockRejectedValue(new Error('Only admins can create users'));
    render(<AddUserForm onCreate={onCreate} verify={ok} />);
    await userEvent.type(screen.getByLabelText('Email'), 'new@company.com');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins can create users');
  });
});

describe('AddUserForm confirmation email', () => {
  const fill = async () => {
    await userEvent.type(screen.getByLabelText('Email'), 'new@company.com');
    await userEvent.click(screen.getByRole('button', { name: /register user/i }));
  };

  it('asks for a confirmation email by default and creates the user unconfirmed', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: '1' });
    const onSend = jest.fn().mockResolvedValue(undefined);
    const onCreated = jest.fn();
    render(<AddUserForm onCreate={onCreate} onSendConfirmation={onSend} onCreated={onCreated} verify={ok} />);
    expect(screen.getByRole('checkbox', { name: /send a confirmation email/i })).toBeChecked();

    await fill();

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ requireConfirmation: true }));
    expect(onSend).toHaveBeenCalledWith('new@company.com');
    expect(await screen.findByRole('status')).toHaveTextContent(/confirmation email sent/i);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('skips the email when the box is unticked', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: '1' });
    const onSend = jest.fn();
    render(<AddUserForm onCreate={onCreate} onSendConfirmation={onSend} verify={ok} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /send a confirmation email/i }));

    await fill();

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ requireConfirmation: false }));
    expect(onSend).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/copy the password now/i);
  });

  it('keeps the account and explains what to do when the email cannot be sent', async () => {
    const onCreate = jest.fn().mockResolvedValue({ id: '1' });
    const onSend = jest.fn().mockRejectedValue(new Error('Error sending confirmation email'));
    render(<AddUserForm onCreate={onCreate} onSendConfirmation={onSend} verify={ok} />);

    await fill();

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('User created');
    expect(status).toHaveTextContent(/confirmation email failed: Error sending confirmation email/i);
    expect(status).toHaveTextContent(/SMTP/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not call onCreated when creation fails', async () => {
    const onCreated = jest.fn();
    render(<AddUserForm onCreate={jest.fn().mockRejectedValue(new Error('nope'))} onCreated={onCreated} verify={ok} />);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
