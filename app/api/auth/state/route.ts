import { NextResponse } from 'next/server';

export async function POST() {
  const nonce = crypto.randomUUID();
  const response = NextResponse.json({ nonce });
  response.cookies.set('oauth_state', nonce, {
    httpOnly: true,
    path: '/',
    maxAge: 300,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
