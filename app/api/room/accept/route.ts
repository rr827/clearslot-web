import { NextRequest, NextResponse } from 'next/server';
import { acceptProposal } from '@/lib/room';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  try {
    const { code, proposalIndex } = await req.json();
    if (!code || proposalIndex == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const accepterIndex = await verifyRoomSession(code, token);
    if (accepterIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    await acceptProposal(code, proposalIndex);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('accept proposal:', err);
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Invalid proposal') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to accept' }, { status: 500 });
  }
}
