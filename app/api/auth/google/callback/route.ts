import { NextRequest, NextResponse } from 'next/server';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=oauth_denied', request.url));
  }

  // Validate state nonce (CSRF protection)
  const expectedNonce = request.cookies.get('oauth_state')?.value;
  let parsedState: { nonce?: string; returnTo?: string } = {};
  try {
    parsedState = stateParam ? JSON.parse(stateParam) : {};
  } catch {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }

  if (parsedState.nonce !== expectedNonce) {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }

  // Only allow relative paths — prevents open redirect to external URLs
  const rawReturnTo = parsedState.returnTo ?? '/room/new';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/room/new';

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      console.error('Google token exchange failed:', await res.text());
      return NextResponse.redirect(new URL('/?error=token_exchange', request.url));
    }

    const data = await res.json();
    const { access_token, expires_in } = data;

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    const isProduction = process.env.NODE_ENV === 'production';

    // httpOnly token — not readable by client JS
    response.cookies.set('aligned_token', access_token, {
      httpOnly: true,
      path: '/',
      maxAge: expires_in as number,
      sameSite: 'lax',
      secure: isProduction,
    });

    // Presence cookies — readable by client to detect auth state
    response.cookies.set('aligned_auth', '1', {
      httpOnly: false,
      path: '/',
      maxAge: THIRTY_DAYS,
      sameSite: 'lax',
      secure: isProduction,
    });
    response.cookies.set('aligned_provider', 'google', {
      httpOnly: false,
      path: '/',
      maxAge: THIRTY_DAYS,
      sameSite: 'lax',
      secure: isProduction,
    });

    // Clear the nonce cookie
    response.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=server', request.url));
  }
}
