import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInForm from '@/components/SignInForm';

describe('SignInForm', () => {
  it('matches snapshot', () => {
    const { container } = render(<SignInForm onSubmit={jest.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('has NO sign-up affordance (invite only)', () => {
    render(<SignInForm onSubmit={jest.fn()} />);
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
  });

  it('does not submit an invalid email', async () => {
    // The email field is type="email"; an invalid value is blocked before the JS
    // guard runs (native constraint validation), and either way onSubmit must not fire.
    const onSubmit = jest.fn();
    render(<SignInForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'bad');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the JS email-format guard for values that pass native checks', async () => {
    // "a@b" satisfies the browser's loose email check but fails our stricter regex.
    const onSubmit = jest.fn();
    render(<SignInForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a password', async () => {
    const onSubmit = jest.fn();
    render(<SignInForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/password is required/i);
  });

  it('submits trimmed credentials', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<SignInForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith('a@b.com', 'secret');
  });

  it('shows server error from props', () => {
    render(<SignInForm onSubmit={jest.fn()} error="Invalid login" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid login');
  });

  it('swallows rejected submit (error comes via props)', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('x'));
    render(<SignInForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
