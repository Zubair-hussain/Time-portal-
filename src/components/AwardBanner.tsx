import React from 'react';
import type { MonthlyAward } from '@/types';
import { formatHuman } from '@/lib/time';

export function AwardBanner({ award }: { award: MonthlyAward | null }) {
  if (!award) {
    return (
      <div className="card" style={{ borderColor: 'var(--border)' }}>
        <p className="dim" style={{ margin: 0 }}>
          No monthly award yet — approved hours determine the winner.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div className="row" style={{ gap: 14 }}>
        <span style={{ fontSize: 32 }} aria-hidden>
          🏆
        </span>
        <div>
          <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Top timer · {award.month}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{award.displayName}</div>
          <div className="mono dim">{formatHuman(award.totalSeconds)} approved</div>
        </div>
      </div>
    </div>
  );
}

export default AwardBanner;
