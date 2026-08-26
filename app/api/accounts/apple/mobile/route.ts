import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import {
  verifyAppleNonce,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  requireAccountSessionSecret,
} from '@/lib/accountSession';
import { exchangeAppleAuthorizationCode, requireAppleSiwaCredentials } from '@/lib/apple';
import { findOrCreateUserForApple, createAccountSession } from '@/lib/storage/accountsStore';

// The bundle identifier is the "client ID" for the native flow — not a
// credential, already public (it's the app's own identity), so no env var.
const MOBILE_CLIENT_ID = 'net.clearslot.app';

const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`apple_mobile:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    requireAccountSessionSecret();
    requireAppleSiwaCredentials();
  } catch {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { identityToken, authorizationCode, nonce, deviceLabel } = body;

  if (
    typeof identityToken !== 'string' ||
    typeof authorizationCode !== 'string' ||
    typeof nonce !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing identityToken, authorizationCode, or nonce' },
      { status: 400 }
    );
  }

  if (!(await verifyAppleNonce(nonce))) {
    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 400 });
  }

  // Exchange the authorization code server-side rather than trust
  // identityToken alone — a successful exchange proves the code is genuine
  // and fresh, not just that some token was signed by Apple at some point.
  // identityToken itself is unused here beyond validating request shape;
  // exchangeAppleAuthorizationCode independently verifies Apple's own
  // returned id_token against Apple's JWKS.
  let claims;
  try {
    claims = await exchangeAppleAuthorizationCode(authorizationCode, MOBILE_CLIENT_ID, nonce);
  } catch {
    return NextResponse.json({ error: 'Apple identity verification failed' }, { status: 401 });
  }

  // Second, tighter gate now that we know who this is.
  if (!(await checkRateLimit(`apple_mobile:${claims.sub}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let userId: string;
  let isNewAccount: boolean;
  try {
    ({ userId, isNewAccount } = await findOrCreateUserForApple(claims));
  } catch {
    return NextResponse.json({ error: 'Failed to create or look up account' }, { status: 500 });
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

  let sessionId: string;
  try {
    sessionId = await createAccountSession(
      userId,
      refreshTokenHash,
      expiresAt,
      typeof deviceLabel === 'string' ? deviceLabel : undefined
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  const accessToken = await signAccessToken(userId, sessionId);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    isNewAccount,
  });
}
