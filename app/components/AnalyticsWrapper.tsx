'use client';

import { usePathname } from 'next/navigation';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  const [path, query = ''] = event.url.split('?');
  const utmParams = new URLSearchParams();
  const params = new URLSearchParams(query);
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase().startsWith('utm_')) {
      utmParams.append(key, value);
    }
  }
  const sanitizedPath = path
    .replace(/\/room\/[A-Z2-9]{6}/i, '/room/[code]')
    .replace(/\/r\/[A-Z2-9]{6}/i, '/r/[code]');
  const safeQuery = utmParams.toString();

  return {
    ...event,
    url: safeQuery ? `${sanitizedPath}?${safeQuery}` : sanitizedPath,
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
