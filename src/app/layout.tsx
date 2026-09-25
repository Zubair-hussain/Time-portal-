import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SITE_URL } from '@/lib/site';

/*
 * Upwork sets every piece of text in "Neue Montreal" (a paid Pangram Pangram face).
 * Hanken Grotesk is the closest free (OFL) match, so it is self-hosted here by
 * next/font — no request to Google at runtime. globals.css still lists
 * "Neue Montreal" first, so a licensed installed copy wins when it is present.
 */
const uiFont = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ui',
});

const description =
  'Time Portal by Zubair Hussain: invite-only time tracking with weekly insights and a monthly award.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Time Portal | Zubair Hussain', template: '%s | Time Portal' },
  description,
  applicationName: 'Time Portal',
  authors: [{ name: 'Zubair Hussain', url: 'https://zubair-hussain-portfolio.detroonshah.workers.dev/' }],
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'Time Portal',
    title: 'Time Portal | Zubair Hussain',
    description,
    url: '/',
    images: [{ url: '/logo.svg', alt: 'ZH.' }],
  },
  twitter: { card: 'summary', title: 'Time Portal | Zubair Hussain', description },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={uiFont.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
