import { NextRequest, NextResponse } from 'next/server';
import { updateParticipantPayload } from '@/lib/room';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { getRoomSessionToken, requireSessionSecret, verifyRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_update:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    requireSessionSecret();
    const body = await req.json().catch(() => null);
    const { code, payload } = body ?? {};
    if (typeof code !== 'string' || typeof payload !== 'string' || payload.length === 0) {
      return NextResponse.json({ error: 'Missing code or payload' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const participantIndex = await verifyRoomSession(code, token);
    if (participantIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    if (!(await checkRateLimit(`room_update:${code.toUpperCase()}:${participantIndex}`, 10, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const room = await updateParticipantPayload(code, participantIndex, payload);
    return NextResponse.json({ room, participantIndex });
  } catch (err: any) {
    console.error('update room participant:', err);
    if (err?.message === 'ROOM_SESSION_SECRET is not configured') {
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
    }
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Invalid participant') {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to update participant' }, { status: 500 });
  }
}
