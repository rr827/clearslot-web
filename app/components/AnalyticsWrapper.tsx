'use client';

import { usePathname } from 'next/navigation';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  const [path] = event.url.split('?');
  return {
    ...event,
    url: path
      .replace(/\/room\/[A-Z2-9]{6}/i, '/room/[code]')
      .replace(/\/r\/[A-Z2-9]{6}/i, '/r/[code]'),
  };
}

export default function AnalyticsWrapper() {
  const pathname = usePathname();
  // The mobile OAuth bounce page is a security-sensitive redirect step, not
  // a product surface — it shouldn't carry analytics/performance telemetry.
  if (pathname === '/mobile/google-redirect') return null;

  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights />
    </>
  );
}
