import { NextRequest, NextResponse } from 'next/server';
import { getRoom, MAX_PARTICIPANTS } from '@/lib/room';
import { checkRateLimit } from '@/lib/rateLimit';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { getClientIp } from '@/lib/clientIp';
import { getRoomCooldownTtlMs, recordFailedRoomAttempt } from '@/lib/roomFailedAttempts';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_get:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  // Repeated 404s here feed the same failed-attempt/cooldown ladder the join
  // endpoint uses, so guessing room codes via GET can't dodge that protection.
  const cooldownTtlMs = await getRoomCooldownTtlMs(ip);
  if (cooldownTtlMs > 0) {
    const retryAfter = Math.max(1, Math.ceil(cooldownTtlMs / 1000));
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again soon.', code: 'cooldown_active', cooldownActive: true, retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const { code } = await params;
    const room = await getRoom(code);
    if (!room) {
      await recordFailedRoomAttempt(ip);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    const inviteMode = req.nextUrl.searchParams.get('invite') === '1';

    const token = inviteMode ? undefined : getRoomSessionToken(req, code);
    const participantIndex = inviteMode ? null : await verifyRoomSession(code, token);

    // Verified members get the full room shape needed to render the page.
    if (participantIndex !== null && participantIndex < room.participants.length) {
      return NextResponse.json(
        { ...room, participantIndex },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Anonymous visitors only learn enough to decide whether to join — no
    // participant payloads or proposals.
    return NextResponse.json(
      {
        code: room.code,
        expiresAt: room.expires_at,
        participantCount: room.participants.length,
        joinable: room.participants.length < MAX_PARTICIPANTS,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to get room' }, { status: 500 });
  }
}
