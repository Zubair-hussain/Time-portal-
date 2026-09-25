import React from 'react';
import type { Metadata } from 'next';

/** Keep the admin console out of search results and link previews. */
export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
