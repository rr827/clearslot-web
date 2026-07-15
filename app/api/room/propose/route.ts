import { NextRequest, NextResponse } from 'next/server';
import { proposeTime } from '@/lib/room';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { code, startTime, endTime } = body ?? {};
    if (typeof code !== 'string' || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (startTime.length > 64 || endTime.length > 64) {
      return NextResponse.json({ error: 'Invalid proposal time' }, { status: 400 });
    }
    const startMs = Date.parse(startTime);
    const endMs = Date.parse(endTime);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return NextResponse.json({ error: 'Invalid proposal time' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const proposerIndex = await verifyRoomSession(code, token);
    if (proposerIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    const rateKey = `room_propose:${code.toUpperCase()}:${proposerIndex}`;
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
