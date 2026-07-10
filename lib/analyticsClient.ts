'use client';

import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture(event, properties ?? {});
}
