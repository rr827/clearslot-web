import { NextRequest, NextResponse } from 'next/server';
import { proposeTime } from '@/lib/room';
import { verifyRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  try {
    const { code, startTime, endTime } = await req.json();
    if (!code || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the caller joined this room (HMAC-signed session cookie)
    const cookieValue = req.cookies.get(`room_session_${code}`)?.value;
    const proposerIndex = await verifyRoomSession(code, cookieValue);
    if (proposerIndex === null) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await proposeTime(code, proposerIndex, startTime, endTime);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('propose time:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to propose' }, { status: 500 });
  }
}
