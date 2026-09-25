'use client';

import React, { useState } from 'react';
import type { AdminUserRow } from '@/lib/auth';

export interface MembersPanelProps {
  users: AdminUserRow[];
  /** Re-send the confirmation email. Rejects with an Error on failure. */
  onResend: (email: string) => Promise<void>;
  /** Set when the members list could not be loaded (e.g. SQL not installed). */
  loadError?: string | null;
}

/** Everyone with an account, their role, and whether they have confirmed their email. */
export function MembersPanel({ users, onResend, loadError }: MembersPanelProps) {
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const resend = async (email: string) => {
    setBusyEmail(email);
    setNotice(null);
    try {
      await onResend(email);
      setNotice({ ok: true, text: `Confirmation email sent to ${email}.` });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Could not send the email.' });
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <section className="console-box" aria-label="Members">
      <h2 className="console-title">&gt;_ members</h2>

      {loadError && (
        <p role="alert" className="console-note console-note-bad">
          {loadError}
        </p>
      )}
      {!loadError && users.length === 0 && <p className="dim">No members yet.</p>}

      <ul className="member-list">
        {users.map((u) => (
          <li key={u.id}>
            <div style={{ minWidth: 0 }}>
              <div className="member-name">{u.displayName || u.email.split('@')[0]}</div>
              <div className="member-email">{u.email}</div>
            </div>
            <div className="member-tags">
              <span className={`tag${u.role === 'admin' ? ' tag-accent' : ''}`}>{u.role}</span>
              {u.emailConfirmed ? (
                <span className="tag tag-ok">confirmed</span>
              ) : (
                <>
                  <span className="tag tag-warn">unconfirmed</span>
                  <button
                    type="button"
                    className="tag-btn"
                    disabled={busyEmail === u.email}
                    onClick={() => void resend(u.email)}
                    aria-label={`Resend confirmation to ${u.email}`}
                  >
                    {busyEmail === u.email ? 'Sending…' : 'Resend'}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {notice && (
        <p role={notice.ok ? 'status' : 'alert'} className={`console-note ${notice.ok ? 'console-note-ok' : 'console-note-bad'}`}>
          {notice.text}
        </p>
      )}
    </section>
  );
}

export default MembersPanel;
