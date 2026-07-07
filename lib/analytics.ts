import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null;
  if (!_client) {
    _client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export function trackEvent(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  const ph = client();
  if (!ph) return;
  ph.capture({ distinctId, event, properties: properties ?? {} });
}
