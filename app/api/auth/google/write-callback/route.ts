import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');

  let parsedState: { nonce?: string; returnTo?: string } = {};
  try {
    parsedState = stateParam ? JSON.parse(stateParam) : {};
  } catch {
    parsedState = {};
  }

  const rawReturnTo = parsedState.returnTo ?? '/room/new';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/room/new';

  const redirectWithError = (errorKey: string) => {
    const url = new URL(returnTo, request.url);
    url.searchParams.set('calendarError', errorKey);
    return NextResponse.redirect(url);
  };

  if (error || !code) {
    return redirectWithError('oauth_denied');
  }

  const expectedNonce = request.cookies.get('oauth_write_state')?.value;
  if (!stateParam || parsedState.nonce !== expectedNonce) {
    return redirectWithError('invalid_state');
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${request.nextUrl.origin}/api/auth/google/write-callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      console.error('Write token exchange failed:', await res.text());
      return redirectWithError('token_exchange');
    }

    const { access_token, expires_in } = await res.json();
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set('aligned_write_token', access_token, {
      httpOnly: true,
      path: '/',
      maxAge: expires_in as number,
      sameSite: 'lax',
      secure: isProduction,
    });
    response.cookies.set('oauth_write_state', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err) {
    console.error('Write OAuth callback error:', err);
    return redirectWithError('server');
  }
}
