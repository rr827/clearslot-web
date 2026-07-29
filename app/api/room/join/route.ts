import { NextRequest, NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room';
import { signRoomSession, requireSessionSecret } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  CHALLENGE_THRESHOLD,
  clearFailedRoomAttempts,
  getFailedRoomAttemptCount,
  getRoomCooldownTtlMs,
  recordFailedRoomAttempt,
} from '@/lib/roomFailedAttempts';
import { getClientIp } from '@/lib/clientIp';
import { isTurnstileConfigured, TURNSTILE_SITE_KEY, verifyTurnstileToken } from '@/lib/turnstile';

function challengeResponse() {
  return NextResponse.json(
    {
      error: 'Additional verification required',
      code: 'challenge_required',
      challengeRequired: true,
      turnstileConfigured: isTurnstileConfigured(),
      turnstileSiteKey: TURNSTILE_SITE_KEY || null,
    },
    { status: 403 }
  );
}

function cooldownResponse(ttlMs: number) {
  const retryAfter = Math.max(1, Math.ceil(ttlMs / 1000));
  return NextResponse.json(
    {
      error: 'Too many failed join attempts. Try again soon.',
      code: 'cooldown_active',
      cooldownActive: true,
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_join:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const cooldownTtlMs = await getRoomCooldownTtlMs(ip);
  if (cooldownTtlMs > 0) {
    return cooldownResponse(cooldownTtlMs);
  }

  try {
    requireSessionSecret();
    const failureCount = await getFailedRoomAttemptCount(ip);
    const body = await req.json().catch(() => null);
    const code = body?.code;
    const payload = body?.payload;
    const turnstileToken = body?.turnstileToken;

    if (typeof code !== 'string' || typeof payload !== 'string' || payload.length === 0) {
      await recordFailedRoomAttempt(ip);
      return NextResponse.json({ error: 'Missing code or payload' }, { status: 400 });
    }

    if (failureCount >= CHALLENGE_THRESHOLD && isTurnstileConfigured()) {
      const verified = await verifyTurnstileToken(turnstileToken, ip);
      if (!verified) {
        await recordFailedRoomAttempt(ip);
        return challengeResponse();
      }
    }

    const { room, participantIndex } = await joinRoom(code, payload);
    await clearFailedRoomAttempts(ip);

    const sessionValue = await signRoomSession(code, participantIndex);
    const response = NextResponse.json({ room, participantIndex, sessionToken: sessionValue });
    response.cookies.set(`room_session_${code}`, sessionValue, {
      httpOnly: true,
      path: '/',
      maxAge: 48 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (err: any) {
    console.error('join room:', err);
    if (err?.message === 'ROOM_SESSION_SECRET is not configured') {
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
    }
    if (
      err?.message === 'Invalid payload' ||
      err?.message === 'Payload too large' ||
      err?.message === 'Invalid room code' ||
      err?.message === 'Room not found' ||
      err?.message === 'Room is full'
    ) {
      await recordFailedRoomAttempt(ip);
    }
    if (err?.message === 'Invalid payload' || err?.message === 'Invalid room code') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err?.message === 'Payload too large') {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Room is full') {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to join room' }, { status: 500 });
  }
}
