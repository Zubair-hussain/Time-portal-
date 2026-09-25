'use client';

import React from 'react';
import type { TimeEntry } from '@/types';
import { formatHuman } from '@/lib/time';
import StatusBadge from '@/components/StatusBadge';

export interface AdminReviewTableProps {
  entries: TimeEntry[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  nameFor?: (userId: string) => string;
}

export function AdminReviewTable({ entries, onApprove, onReject, nameFor }: AdminReviewTableProps) {
  if (entries.length === 0) {
    return <p className="dim">No entries to review.</p>;
  }
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Member</th>
          <th>Started</th>
          <th>Duration</th>
          <th>Note</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td>{nameFor ? nameFor(e.userId) : e.userId.slice(0, 8)}</td>
            <td className="mono dim">{new Date(e.startedAt).toLocaleString()}</td>
            <td className="mono">{formatHuman(e.durationSeconds)}</td>
            <td>{e.note || <span className="dim">—</span>}</td>
            <td>
              <StatusBadge status={e.status} />
            </td>
            <td>
              <div className="row">
                <button
                  className="btn"
                  onClick={() => onApprove(e.id)}
                  disabled={e.status === 'approved'}
                  aria-label={`Approve entry ${e.id}`}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onReject(e.id)}
                  disabled={e.status === 'rejected'}
                  aria-label={`Reject entry ${e.id}`}
                >
                  Reject
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default AdminReviewTable;
