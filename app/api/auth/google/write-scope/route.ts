import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/room/new';
  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${request.nextUrl.origin}/api/auth/google/write-callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: JSON.stringify({ nonce, returnTo }),
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
  response.cookies.set('oauth_write_state', nonce, {
    httpOnly: true,
    path: '/',
    maxAge: 300,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
