import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    const scrub = (s: string) => s.replace(/\/room\/[A-Z2-9]{6}/gi, '/room/[code]');
    if (event.request?.url) event.request.url = scrub(event.request.url);
    event.breadcrumbs?.forEach((b) => {
      if (b.data?.url) b.data.url = scrub(b.data.url);
    });
    return event;
  },
  integrations: (integrations) => integrations.filter(i => i.name !== 'Replay'),
});
