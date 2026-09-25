import React from 'react';
import type { EntryStatus } from '@/types';

const LABELS: Record<EntryStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: EntryStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}

export default StatusBadge;
