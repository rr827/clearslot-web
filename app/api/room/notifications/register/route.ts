import { NextRequest, NextResponse } from 'next/server';
import { getRoom } from '@/lib/room';
import { upsertRoomNotificationTarget } from '@/lib/roomNotifications';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_notification_register:${ip}`, 20, 60_000))) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const { code, expoPushToken } = body ?? {};
    if (typeof code !== 'string' || typeof expoPushToken !== 'string' || expoPushToken.length === 0) {
      return NextResponse.json({ error: 'Missing code or expoPushToken' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const participantIndex = await verifyRoomSession(code, token);
    if (participantIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    if (!(await checkRateLimit(`room_notification_register:${code.toUpperCase()}:${participantIndex}`, 6, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await upsertRoomNotificationTarget({
      roomCode: code.toUpperCase(),
      participantIndex,
      expoPushToken,
      expiresAt: room.expires_at,
    });

    return NextResponse.json({ ok: true, participantIndex });
  } catch (err: any) {
    console.error('register room notification target:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to register notification target' },
      { status: 500 }
    );
  }
}
