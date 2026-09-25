'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PortalUser, TimeEntry } from '@/types';
import RequireAuth from '@/components/RequireAuth';
import Nav from '@/components/Nav';
import AdminReviewTable from '@/components/AdminReviewTable';
import AwardBanner from '@/components/AwardBanner';
import AddUserForm from '@/components/AddUserForm';
import MembersPanel from '@/components/MembersPanel';
import CommandSearch from '@/components/CommandSearch';
import StatusChips from '@/components/StatusChips';
import BinaryBackdrop from '@/components/BinaryBackdrop';
import { listAllEntries, reviewEntry } from '@/lib/entries';
import { adminCreateUser, adminListUsers, sendConfirmationEmail, type AdminUserRow } from '@/lib/auth';
import { computeMonthlyAward, monthlyLeaderboard } from '@/lib/awards';
import { countByStatus, filterEntries, suggest, type StatusFilter } from '@/lib/adminFilter';
import { monthKey } from '@/lib/date';
import { formatHuman } from '@/lib/time';

function AdminInner() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const month = monthKey(new Date());

  const refreshEntries = useCallback(async () => {
    try {
      setEntries(await listAllEntries());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      setUsers(await adminListUsers());
      setUsersError(null);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'Could not load members.');
    }
  }, []);

  useEffect(() => {
    void refreshEntries();
    void refreshUsers();
  }, [refreshEntries, refreshUsers]);

  const act = async (id: string, next: 'approved' | 'rejected') => {
    await reviewEntry(id, next);
    await refreshEntries();
  };

  const nameFor = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    return (userId: string) => {
      const u = byId.get(userId);
      return u ? u.displayName || u.email.split('@')[0] || userId.slice(0, 8) : userId.slice(0, 8);
    };
  }, [users]);

  const portalUsers: PortalUser[] = useMemo(
    () => users.map((u) => ({ id: u.id, email: u.email, role: u.role, displayName: u.displayName || u.email })),
    [users],
  );

  const finished = useMemo(() => entries.filter((e) => e.endedAt), [entries]);
  const counts = useMemo(() => countByStatus(finished), [finished]);
  const visible = useMemo(() => filterEntries(finished, { query, status }, nameFor), [finished, query, status, nameFor]);
  const suggestions = useMemo(() => suggest(finished, query, nameFor), [finished, query, nameFor]);
  const award = computeMonthlyAward(month, entries, portalUsers);
  const board = monthlyLeaderboard(month, entries, portalUsers);

  return (
    <main className="container console" style={{ paddingBottom: 72 }}>
      <BinaryBackdrop />
      <Nav />

      <header className="console-head">
        <div>
          <div className="eyebrow">&gt;_ console · {month}</div>
          <h1 className="console-h1">Admin console</h1>
        </div>
        <a href="#register-user-form" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          + Register user
        </a>
      </header>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

      <CommandSearch value={query} onChange={setQuery} suggestions={suggestions} />
      <StatusChips value={status} counts={counts} onChange={setStatus} />

      <div className="console-split">
        <section className="console-box" aria-label="Review queue">
          <h2 className="console-title">&gt;_ review_queue</h2>
          <div style={{ overflowX: 'auto' }}>
            <AdminReviewTable
              entries={visible}
              nameFor={nameFor}
              onApprove={(id) => void act(id, 'approved')}
              onReject={(id) => void act(id, 'rejected')}
            />
          </div>
          {visible.length === 0 && finished.length > 0 && (
            <p className="dim" style={{ margin: '12px 0 0' }}>
              Nothing matches this search.{' '}
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
              >
                Clear filters
              </button>
            </p>
          )}
        </section>

        <div className="console-side">
          <AwardBanner award={award} />
          <section className="console-box" aria-label="Leaderboard">
            <h2 className="console-title">&gt;_ leaderboard</h2>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {board.slice(0, 5).map((b) => (
                <li key={b.userId} className="mono" style={{ fontSize: 13, marginBottom: 4 }}>
                  {b.displayName} — {formatHuman(b.totalSeconds)}
                </li>
              ))}
              {board.length === 0 && <li className="dim">No approved hours yet</li>}
            </ol>
          </section>
          <MembersPanel users={users} onResend={sendConfirmationEmail} loadError={usersError} />
          <AddUserForm
            onCreate={adminCreateUser}
            onSendConfirmation={sendConfirmationEmail}
            onCreated={() => void refreshUsers()}
          />
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth adminOnly>
      <AdminInner />
    </RequireAuth>
  );
}
