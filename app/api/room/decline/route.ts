import { NextRequest, NextResponse } from 'next/server';
import { declineProposal } from '@/lib/room';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function POST(req: NextRequest) {
  try {
    const { code, proposalIndex } = await req.json();
    if (!code || proposalIndex == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const declinerIndex = await verifyRoomSession(code, token);
    if (declinerIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateKey = `room_decline:${code.toUpperCase()}:${declinerIndex}:${token ?? ip}`;
    if (!(await checkRateLimit(rateKey, 30, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    await declineProposal(code, proposalIndex);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('decline proposal:', err);
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Invalid proposal') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to decline' }, { status: 500 });
  }
}
