import { NextRequest, NextResponse } from 'next/server';
import { buildCsp, STATIC_SECURITY_HEADERS } from '@/lib/securityHeaders';

function nonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const cspNonce = nonce();
  requestHeaders.set('x-nonce', cspNonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const csp = buildCsp(cspNonce, process.env.NODE_ENV !== 'production');
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', cspNonce);

  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
