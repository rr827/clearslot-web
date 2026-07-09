'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

let initialized = false;

export default function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (!initialized) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        persistence: 'localStorage',
      });
      initialized = true;
    }
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (pathname === '/mobile/google-redirect') return;
    const sanitized = pathname
      .replace(/\/room\/[A-Z2-9]{6}/i, '/room/[code]')
      .replace(/\/r\/[A-Z2-9]{6}/i, '/r/[code]');
    posthog.capture('$pageview', { $current_url: sanitized });
  }, [pathname]);

  return null;
}
