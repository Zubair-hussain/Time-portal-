import React from 'react';
import type { Metadata } from 'next';

/** Signed-in area: keep it out of search results. */
export const metadata: Metadata = {
  title: 'Insights',
  robots: { index: false, follow: false },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
