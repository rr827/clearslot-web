'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return {
    ...event,
    url: event.url.replace(/\/room\/[A-Z2-9]{6}/i, '/room/[code]'),
  };
}

export default function AnalyticsWrapper() {
  return <Analytics beforeSend={beforeSend} />;
}
