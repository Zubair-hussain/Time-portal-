'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { TimeEntry } from '@/types';
import { useAuth } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Nav from '@/components/Nav';
import TimerCard from '@/components/TimerCard';
import StatusBadge from '@/components/StatusBadge';
import AwardBanner from '@/components/AwardBanner';
import { listMyEntries, startEntry, stopEntry } from '@/lib/entries';
import { totalApprovedSeconds } from '@/lib/insights';
import { computeMonthlyAward } from '@/lib/awards';
import { monthKey } from '@/lib/date';
import { formatHuman } from '@/lib/time';

function DashboardInner() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const running = entries.find((e) => e.endedAt === null) ?? null;

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setEntries(await listMyEntries(user.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load entries');
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleStart = async (note: string) => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      await startEntry(user.id, note);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!running) return;
    setBusy(true);
    try {
      await stopEntry(running.id);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to stop');
    } finally {
      setBusy(false);
    }
  };

  const award = user ? computeMonthlyAward(monthKey(new Date()), entries, [
    { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
  ]) : null;

  return (
    <main className="container" style={{ paddingBottom: 60 }}>
      <Nav />
      <h1 style={{ fontSize: 24 }}>Welcome, {user?.displayName}</h1>
      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <TimerCard runningSince={running?.startedAt ?? null} onStart={handleStart} onStop={handleStop} busy={busy} />
        <div className="card">
          <div className="dim" style={{ fontSize: 13 }}>Approved this account</div>
          <div className="stat-value">{formatHuman(totalApprovedSeconds(entries))}</div>
          <div className="dim" style={{ fontSize: 13 }}>{entries.length} total entries</div>
        </div>
        <AwardBanner award={award} />
      </div>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Recent entries</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Started</th>
              <th>Duration</th>
              <th>Note</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 12).map((e) => (
              <tr key={e.id}>
                <td className="mono dim">{new Date(e.startedAt).toLocaleString()}</td>
                <td className="mono">{e.endedAt ? formatHuman(e.durationSeconds) : 'running…'}</td>
                <td>{e.note || <span className="dim">—</span>}</td>
                <td><StatusBadge status={e.status} /></td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="dim" style={{ textAlign: 'center', padding: 24 }}>
                  No entries yet — start your first timer above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
