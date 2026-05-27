import { NextRequest, NextResponse } from 'next/server';
import { acceptProposal } from '@/lib/room';
import { verifyRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  try {
    const { code, proposalIndex } = await req.json();
    if (!code || proposalIndex == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the caller joined this room (HMAC-signed session cookie)
    const cookieValue = req.cookies.get(`room_session_${code}`)?.value;
    const verifiedIndex = await verifyRoomSession(code, cookieValue);
    if (verifiedIndex === null) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await acceptProposal(code, proposalIndex);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('accept proposal:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to accept' }, { status: 500 });
  }
}
