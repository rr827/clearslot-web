import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { headers } from 'next/headers';
import AnalyticsWrapper from './components/AnalyticsWrapper';
import PostHogProvider from './components/PostHogProvider';
import ErrorBoundary from './components/ErrorBoundary';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-inter-tight',
});

export const metadata: Metadata = {
  title: 'ClearSlot — Find time together',
  description: 'Share your availability privately. Find when you are both free. No account required.',
  openGraph: {
    title: 'ClearSlot',
    description: 'Find time together without the back and forth.',
    url: 'https://clearslot.net',
    siteName: 'ClearSlot',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reading the nonce here is required for Next.js to apply the same
  // per-request nonce (set on the request in middleware.ts) to its own
  // internally generated inline scripts. Without this, the strict CSP
  // blocks React hydration on every page.
  await headers();

  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>{children}</ErrorBoundary>
        <AnalyticsWrapper />
        <PostHogProvider />
      </body>
    </html>
  );
}
