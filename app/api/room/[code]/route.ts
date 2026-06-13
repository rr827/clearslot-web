import { NextRequest, NextResponse } from 'next/server';
import { getRoom, MAX_PARTICIPANTS } from '@/lib/room';
import { checkRateLimit } from '@/lib/rateLimit';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!(await checkRateLimit(`room_get:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    const { code } = await params;
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const token = getRoomSessionToken(req, code);
    const participantIndex = await verifyRoomSession(code, token);

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
