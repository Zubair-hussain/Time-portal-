'use client';

import React, { useEffect, useState } from 'react';
import { formatClock } from '@/lib/time';

export interface TimerCardProps {
  /** ISO start time when running, else null. */
  runningSince: string | null;
  onStart: (note: string) => void | Promise<void>;
  onStop: () => void | Promise<void>;
  busy?: boolean;
}

/** Live stopwatch card. Ticks locally each second while running. */
export function TimerCard({ runningSince, onStart, onStop, busy }: TimerCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!runningSince) {
      setElapsed(0);
      return;
    }
    const start = Date.parse(runningSince);
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningSince]);

  const running = Boolean(runningSince);

  return (
    <div className="card">
      <div className="row spread">
        <span className="dim" style={{ fontSize: 13 }}>
          {running ? 'Tracking…' : 'Ready'}
        </span>
        <span
          className="badge"
          style={{ color: running ? 'var(--success)' : 'var(--text-faint)', borderColor: 'var(--border)' }}
        >
          {running ? 'Live' : 'Idle'}
        </span>
      </div>

      <div className="stat-value" style={{ margin: '12px 0', fontSize: 44 }} data-testid="timer-clock">
        {formatClock(elapsed)}
      </div>

      {!running && (
        <input
          className="input"
          placeholder="What are you working on? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: 12 }}
          aria-label="Session note"
        />
      )}

      {running ? (
        <button className="btn btn-danger" onClick={() => onStop()} disabled={busy} style={{ width: '100%' }}>
          Stop
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => onStart(note)}
          disabled={busy}
          style={{ width: '100%' }}
        >
          Start timer
        </button>
      )}
    </div>
  );
}

export default TimerCard;
