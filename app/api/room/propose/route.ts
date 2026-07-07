import { NextRequest, NextResponse } from 'next/server';
import { proposeTime } from '@/lib/room';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function POST(req: NextRequest) {
  try {
    const { code, startTime, endTime } = await req.json();
    if (!code || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const proposerIndex = await verifyRoomSession(code, token);
    if (proposerIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateKey = `room_propose:${code.toUpperCase()}:${proposerIndex}:${token ?? ip}`;
    if (!(await checkRateLimit(rateKey, 12, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    await proposeTime(code, proposerIndex, startTime, endTime);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('propose time:', err);
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Invalid participant') {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to propose' }, { status: 500 });
  }
}
