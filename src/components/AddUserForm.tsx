'use client';

import React, { useState } from 'react';
import type { UserRole } from '@/types';
import { verifyEmail, type EmailVerdict } from '@/lib/emailCheck';
import { generateTempPassword } from '@/lib/userSql';

export interface AddUserFormProps {
  /** Creates the user. Resolves on success, rejects with an Error on failure. */
  onCreate: (input: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    requireConfirmation: boolean;
  }) => Promise<unknown>;
  /** Sends the confirmation email to a newly created, unconfirmed user. */
  onSendConfirmation?: (email: string) => Promise<void>;
  /** Called after a user is created (e.g. to refresh the members list). */
  onCreated?: () => void;
  /** Email verifier (injectable for tests). Defaults to format + disposable + DNS check. */
  verify?: (email: string) => Promise<EmailVerdict>;
}

/**
 * Admin-only "Register user" panel. One click creates the account in Supabase via
 * the admin-gated `admin_create_user` database function. There is no public sign-up.
 */
export function AddUserForm({ onCreate, onSendConfirmation, onCreated, verify = verifyEmail }: AddUserFormProps) {
  const [email, setEmail] = useState('');
  const [verdict, setVerdict] = useState<EmailVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [password, setPassword] = useState(() => generateTempPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
    confirmation: 'sent' | 'failed' | 'none';
    confirmationError?: string;
  } | null>(null);

  const runVerify = async (): Promise<EmailVerdict> => {
    setChecking(true);
    try {
      const result = await verify(email);
      setVerdict(result);
      return result;
    } finally {
      setChecking(false);
    }
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await runVerify();
      if (result.status === 'invalid') {
        setError(result.reason ?? 'This email address is not valid.');
        return;
      }
      const cleanEmail = result.email;
      await onCreate({ email: cleanEmail, password, displayName: displayName.trim(), role, requireConfirmation });

      let confirmation: 'sent' | 'failed' | 'none' = 'none';
      let confirmationError: string | undefined;
      if (requireConfirmation && onSendConfirmation) {
        try {
          await onSendConfirmation(cleanEmail);
          confirmation = 'sent';
        } catch (mailErr) {
          confirmation = 'failed';
          confirmationError = mailErr instanceof Error ? mailErr.message : 'Could not send the email.';
        }
      }
      setCreated({ email: cleanEmail, password, confirmation, confirmationError });
      onCreated?.();
      setEmail('');
      setDisplayName('');
      setRole('member');
      setPassword(generateTempPassword());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="console-box" onSubmit={handle} aria-label="Register user" id="register-user-form">
      <h2 className="console-title">&gt;_ register_user</h2>
      <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
        Creates the account in Supabase. Share the email and temporary password with them.
      </p>

      <label htmlFor="new-email" className="signin-label">
        Email
      </label>
      <input
        id="new-email"
        className="input"
        type="email"
        placeholder="teammate@company.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setVerdict(null);
        }}
        onBlur={() => {
          if (email.trim()) void runVerify();
        }}
        aria-describedby="email-status"
        style={{ marginBottom: 6 }}
      />
      <div id="email-status" aria-live="polite" style={{ fontSize: 12, minHeight: 18, marginBottom: 10 }}>
        {checking && <span className="dim">Checking email…</span>}
        {!checking && verdict?.status === 'valid' && !verdict.suggestion && (
          <span style={{ color: 'var(--success)' }}>✓ Email looks valid</span>
        )}
        {!checking && verdict?.status === 'valid' && verdict.suggestion && (
          <span style={{ color: 'var(--warning)' }}>This domain accepts mail, but check the spelling.</span>
        )}
        {!checking && verdict?.status === 'invalid' && (
          <span style={{ color: 'var(--danger)' }}>{verdict.reason}</span>
        )}
        {!checking && verdict?.status === 'unknown' && (
          <span className="dim">{verdict.reason ?? 'Could not fully verify this email.'}</span>
        )}
        {!checking && verdict?.suggestion && (
          <>
            {' '}
            <button
              type="button"
              className="dim"
              style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => {
                setEmail(verdict.suggestion ?? '');
                setVerdict(null);
              }}
            >
              Did you mean {verdict.suggestion}?
            </button>
          </>
        )}
      </div>

      <label htmlFor="new-name" className="signin-label">
        Display name
      </label>
      <input
        id="new-name"
        className="input"
        type="text"
        placeholder="Full name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      <label htmlFor="new-role" className="signin-label">
        Role
      </label>
      <select
        id="new-role"
        className="input"
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
        style={{ marginBottom: 14 }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>

      <label htmlFor="new-pass" className="signin-label">
        Temporary password
      </label>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <input
          id="new-pass"
          className="input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => setPassword(generateTempPassword())}>
          New
        </button>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={requireConfirmation}
          onChange={(e) => setRequireConfirmation(e.target.checked)}
        />
        <span>
          <strong>Send a confirmation email</strong>
          <small>
            The user must click the link in it before they can sign in. This is the only way to prove they own the
            address. Needs SMTP set up in Supabase. Untick to create a pre-confirmed account.
          </small>
        </span>
      </label>

      {error && (
        <p role="alert" className="console-note console-note-bad">
          {error}
        </p>
      )}

      {created && (
        <div role="status" className="console-note console-note-ok">
          <strong>User created</strong>
          <div className="mono" style={{ fontSize: 13, marginTop: 6 }}>
            {created.email}
            <br />
            {created.password}
          </div>
          {created.confirmation === 'sent' && (
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>
              Confirmation email sent. They can sign in after clicking the link.
            </p>
          )}
          {created.confirmation === 'failed' && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--warning)' }}>
              The account exists but the confirmation email failed: {created.confirmationError} They cannot sign in
              until confirmed. Configure SMTP in Supabase (Authentication → SMTP), then use Resend in Members.
            </p>
          )}
          {created.confirmation === 'none' && (
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>Copy the password now. It is not shown again.</p>
          )}
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', marginTop: 14 }}>
        {busy ? 'Creating…' : 'Register user'}
      </button>
    </form>
  );
}

export default AddUserForm;
