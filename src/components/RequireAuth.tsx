'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/routes';

/** Client-side gate. Redirects to the sign-in page when unauthenticated. */
export function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(ROUTES.home);
    } else if (adminOnly && user.role !== 'admin') {
      router.replace(ROUTES.dashboard);
    }
  }, [user, loading, adminOnly, router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px' }}>
        <p className="dim">Loading…</p>
      </div>
    );
  }
  if (!user || (adminOnly && user.role !== 'admin')) return null;
  return <>{children}</>;
}

export default RequireAuth;
