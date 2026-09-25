'use client';

import React, { useState } from 'react';
import { isValidEmail } from '@/lib/validation';
import ZHLogo from '@/components/ZHLogo';

export interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string | null;
}

/* Inline icons (stroke = currentColor so they theme automatically) */
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
  </svg>
);
const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    {off ? (
      <>
        <path d="M4 4l16 16" strokeLinecap="round" />
        <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.2 2.9M6.2 6.7C3.9 8.1 3 10.3 3 12c0 2 3 6 9 6 1.2 0 2.3-.2 3.3-.5" />
        <path d="M9.7 9.9a3 3 0 0 0 4.3 4.2" />
      </>
    ) : (
      <>
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Sign-in ONLY. No public sign-up — members are provisioned by an admin.
 * Matches the ideas/login-idea reference: icon inputs, password toggle,
 * gradient submit button, bold-sans branding.
 */
export function SignInForm({ onSubmit, error }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!isValidEmail(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setLocalError('Password is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
    } catch {
      // error surfaced via the `error` prop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="signin-card" onSubmit={handle} aria-label="Sign in">
      <div className="row" style={{ marginBottom: 26 }}>
        <ZHLogo size={40} withWordmark />
      </div>

      <h1 className="signin-title">Sign in</h1>
      <p className="signin-sub">Access is invite-only. Contact your admin to be added.</p>

      <label htmlFor="email" className="signin-label">
        Email
      </label>
      <div className="field">
        <span className="field-icon">
          <MailIcon />
        </span>
        <input
          id="email"
          className="input has-icon"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <label htmlFor="password" className="signin-label" style={{ marginTop: 18 }}>
        Password
      </label>
      <div className="field">
        <span className="field-icon">
          <LockIcon />
        </span>
        <input
          id="password"
          className="input has-icon has-trailing"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="field-trailing"
          aria-label={showPw ? 'Hide password' : 'Show password'}
          onClick={() => setShowPw((v) => !v)}
        >
          <EyeIcon off={!showPw} />
        </button>
      </div>

      {(localError || error) && (
        <p role="alert" className="signin-error">
          {localError || error}
        </p>
      )}

      <button className="btn btn-gradient" type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
        {!submitting && <ArrowIcon />}
      </button>
    </form>
  );
}

export default SignInForm;
