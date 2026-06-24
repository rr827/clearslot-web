import { NextRequest, NextResponse } from 'next/server';
import { declineProposal } from '@/lib/room';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';

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
