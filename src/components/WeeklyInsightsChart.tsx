'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeeklyInsight } from '@/types';
import { toHours } from '@/lib/time';

export interface WeeklyInsightsChartProps {
  insights: WeeklyInsight[];
}

/** Bar chart of hours per ISO week. */
export function WeeklyInsightsChart({ insights }: WeeklyInsightsChartProps) {
  const data = insights.map((i) => ({ week: i.isoWeek.replace(/^\d{4}-/, ''), hours: toHours(i.totalSeconds) }));

  if (data.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="dim">No activity yet. Start a timer to see weekly insights.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Weekly hours</h2>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" stroke="var(--text-dim)" fontSize={12} />
            <YAxis stroke="var(--text-dim)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default WeeklyInsightsChart;
