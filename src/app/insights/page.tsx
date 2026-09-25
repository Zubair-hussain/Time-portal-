'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { TimeEntry } from '@/types';
import { useAuth } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Nav from '@/components/Nav';
import WeeklyInsightsChart from '@/components/WeeklyInsightsChart';
import { listMyEntries } from '@/lib/entries';
import { buildWeeklyInsights, totalApprovedSeconds } from '@/lib/insights';
import { formatHuman } from '@/lib/time';

function InsightsInner() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setEntries(await listMyEntries(user.id));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const weekly = buildWeeklyInsights(entries);
  const bestWeek = weekly.reduce<number>((m, w) => Math.max(m, w.totalSeconds), 0);

  return (
    <main className="container" style={{ paddingBottom: 60 }}>
      <Nav />
      <h1 style={{ fontSize: 24 }}>Your insights</h1>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="dim" style={{ fontSize: 13 }}>Total approved</div>
          <div className="stat-value">{formatHuman(totalApprovedSeconds(entries))}</div>
        </div>
        <div className="card">
          <div className="dim" style={{ fontSize: 13 }}>Weeks tracked</div>
          <div className="stat-value">{weekly.length}</div>
        </div>
        <div className="card">
          <div className="dim" style={{ fontSize: 13 }}>Best week</div>
          <div className="stat-value">{formatHuman(bestWeek)}</div>
        </div>
      </div>

      <WeeklyInsightsChart insights={weekly} />
    </main>
  );
}

export default function InsightsPage() {
  return (
    <RequireAuth>
      <InsightsInner />
    </RequireAuth>
  );
}
