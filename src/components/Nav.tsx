'use client';

import React from 'react';
import Link from 'next/link';
import ZHLogo from '@/components/ZHLogo';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/routes';

export function Nav() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <nav
      className="row spread"
      style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 24 }}
    >
      <Link href="/dashboard/" aria-label="Home">
        <ZHLogo size={28} withWordmark />
      </Link>
      <div className="row" style={{ gap: 22 }}>
        <Link href="/dashboard/" className="label" style={{ color: 'var(--text)' }}>
          Dashboard
        </Link>
        <Link href="/insights/" className="label" style={{ color: 'var(--text)' }}>
          Insights
        </Link>
        {user.role === 'admin' && (
          <Link href={ROUTES.admin} className="label" style={{ color: 'var(--accent)' }}>
            Admin
          </Link>
        )}
        <span className="label">{user.displayName}</span>
        <button className="btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default Nav;
