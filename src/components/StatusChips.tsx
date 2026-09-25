import React from 'react';
import type { StatusFilter } from '@/lib/adminFilter';

const OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export interface StatusChipsProps {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
}

/** Outlined "button" tiles that filter the review table and show live counts. */
export function StatusChips({ value, counts, onChange }: StatusChipsProps) {
  return (
    <div className="chips" role="group" aria-label="Filter by status">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`chip${value === o.key ? ' chip-on' : ''}`}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          <span className="chip-label">{o.label}</span>
          <span className="chip-count">{counts[o.key]}</span>
        </button>
      ))}
    </div>
  );
}

export default StatusChips;
