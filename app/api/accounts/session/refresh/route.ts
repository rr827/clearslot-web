import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  requireAccountSessionSecret,
} from '@/lib/accountSession';
import {
  findSessionByRefreshHash,
  createAccountSession,
  markSessionReplaced,
  revokeAllAccountSessions,
} from '@/lib/storage/accountsStore';

const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`account_session_refresh:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    requireAccountSessionSecret();
  } catch {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { refreshToken } = body;
  if (typeof refreshToken !== 'string') {
    return NextResponse.json({ error: 'Missing refreshToken' }, { status: 400 });
  }

  const session = await findSessionByRefreshHash(hashRefreshToken(refreshToken));

  if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  // Reuse of an already-rotated refresh token is a theft signal — revoke the
  // whole chain for this user rather than just rejecting this one request.
  if (session.replacedBySessionId) {
    await revokeAllAccountSessions(session.userId);
    return NextResponse.json({ error: 'Session has already been rotated' }, { status: 401 });
  }

  if (!(await checkRateLimit(`account_session_refresh:${session.userId}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const newRefreshToken = generateRefreshToken();
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  const newSessionId = await createAccountSession(session.userId, hashRefreshToken(newRefreshToken), newExpiresAt);
  await markSessionReplaced(session.id, newSessionId);

  const accessToken = await signAccessToken(session.userId, newSessionId);

  return NextResponse.json({
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}
