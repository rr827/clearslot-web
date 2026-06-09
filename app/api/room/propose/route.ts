import { NextRequest, NextResponse } from 'next/server';
import { proposeTime } from '@/lib/room';
import { verifyRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  try {
    const { code, startTime, endTime, participantIndex } = await req.json();
    if (!code || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Try HMAC-signed session cookie first (most secure)
    const cookieValue = req.cookies.get(`room_session_${code}`)?.value;
    const verifiedIndex = await verifyRoomSession(code, cookieValue);

    // Fall back to client-provided index (for participants without a session cookie)
    const proposerIndex = verifiedIndex ?? participantIndex ?? 0;

    await proposeTime(code, proposerIndex, startTime, endTime);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('propose time:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to propose' }, { status: 500 });
  }
}
