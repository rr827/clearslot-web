const SELF = "'self'";

export function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    SELF,
    `'nonce-${nonce}'`,
    'https://va.vercel-scripts.com',
    'https://challenges.cloudflare.com',
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const directives = [
    `default-src ${SELF}`,
    `base-uri ${SELF}`,
    "object-src 'none'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${SELF} 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src ${SELF} https://fonts.gstatic.com`,
    `img-src ${SELF} data: blob:`,
    `connect-src ${SELF} https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://login.microsoftonline.com https://graph.microsoft.com https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://challenges.cloudflare.com https://app.posthog.com https://eu.posthog.com https://*.sentry.io https://o*.ingest.sentry.io`,
    `frame-src https://accounts.google.com https://login.microsoftonline.com https://challenges.cloudflare.com`,
    "frame-ancestors 'none'",
    `form-action ${SELF}`,
  ];

  return directives.join('; ');
}

export const STATIC_SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
} as const;
