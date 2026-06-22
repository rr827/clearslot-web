'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  const [path] = event.url.split('?');
  return {
    ...event,
    url: path.replace(/\/room\/[A-Z2-9]{6}/i, '/room/[code]'),
  };
}

export default function AnalyticsWrapper() {
  return <Analytics beforeSend={beforeSend} />;
}
