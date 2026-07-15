import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    const scrub = (s: string) => s
      .replace(/\/room\/[A-Z2-9]{6}/gi, '/room/[code]')
      .replace(/\/r\/[A-Z2-9]{6}/gi, '/r/[code]');
    if (event.request?.url) event.request.url = scrub(event.request.url);
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.Cookie;
        delete event.request.headers.authorization;
        delete event.request.headers.Authorization;
      }
      event.request.cookies = {};
      delete event.request.data;
    }
    event.breadcrumbs?.forEach((b) => {
      if (b.data?.url) b.data.url = scrub(b.data.url);
    });
    return event;
  },
  integrations: (integrations) => integrations.filter(i => i.name !== 'Replay'),
});
