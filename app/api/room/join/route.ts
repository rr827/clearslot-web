import { NextRequest, NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room';
import { signRoomSession, requireSessionSecret } from '@/lib/roomSession';
import {
  checkRateLimit,
  clearExpiringCounter,
  getExpiringCounter,
  getExpiringCounterTtlMs,
  incrementExpiringCounter,
  setExpiringCounter,
} from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { isTurnstileConfigured, TURNSTILE_SITE_KEY, verifyTurnstileToken } from '@/lib/turnstile';

const FAILED_JOIN_WINDOW_MS = 15 * 60_000;
const SHORT_COOLDOWN_MS = 30_000;
const LONG_COOLDOWN_MS = 10 * 60_000;
const CHALLENGE_THRESHOLD = 5;
const SHORT_COOLDOWN_THRESHOLD = 8;
const LONG_COOLDOWN_THRESHOLD = 12;

function failureKey(ip: string): string {
  return `room_join_failed:${ip}`;
}

function cooldownKey(ip: string): string {
  return `room_join_cooldown:${ip}`;
}

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

async function recordFailedJoin(ip: string): Promise<number> {
  const count = await incrementExpiringCounter(failureKey(ip), FAILED_JOIN_WINDOW_MS);

  if (count >= LONG_COOLDOWN_THRESHOLD) {
    await setExpiringCounter(cooldownKey(ip), 1, LONG_COOLDOWN_MS);
  } else if (count >= SHORT_COOLDOWN_THRESHOLD) {
    await setExpiringCounter(cooldownKey(ip), 1, SHORT_COOLDOWN_MS);
  }

  return count;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_join:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const cooldownTtlMs = await getExpiringCounterTtlMs(cooldownKey(ip));
  if (cooldownTtlMs > 0) {
    return cooldownResponse(cooldownTtlMs);
  }

  try {
    requireSessionSecret();
    const failureCount = await getExpiringCounter(failureKey(ip));
    const body = await req.json().catch(() => null);
    const code = body?.code;
    const payload = body?.payload;
    const turnstileToken = body?.turnstileToken;

    if (typeof code !== 'string' || typeof payload !== 'string' || payload.length === 0) {
      await recordFailedJoin(ip);
      return NextResponse.json({ error: 'Missing code or payload' }, { status: 400 });
    }

    if (failureCount >= CHALLENGE_THRESHOLD && isTurnstileConfigured()) {
      const verified = await verifyTurnstileToken(turnstileToken, ip);
      if (!verified) {
        await recordFailedJoin(ip);
        return challengeResponse();
      }
    }

    const { room, participantIndex } = await joinRoom(code, payload);
    await clearExpiringCounter(failureKey(ip));
    await clearExpiringCounter(cooldownKey(ip));

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
      await recordFailedJoin(ip);
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
