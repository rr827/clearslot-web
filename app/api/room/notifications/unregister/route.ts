import { NextRequest, NextResponse } from 'next/server';
import { deleteRoomNotificationTarget } from '@/lib/roomNotifications';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_notification_unregister:${ip}`, 20, 60_000))) {
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

    const normalizedCode = code.toUpperCase();
    const token = getRoomSessionToken(req, normalizedCode);
    const participantIndex = await verifyRoomSession(normalizedCode, token);
    if (participantIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    if (!(await checkRateLimit(`room_notification_unregister:${normalizedCode}:${participantIndex}`, 10, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    await deleteRoomNotificationTarget({
      roomCode: normalizedCode,
      participantIndex,
      expoPushToken,
    });

    return NextResponse.json({ ok: true, participantIndex });
  } catch (err: any) {
    console.error('unregister room notification target:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to unregister notification target' },
      { status: 500 }
    );
  }
}
