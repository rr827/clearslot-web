import { NextRequest, NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room';
import { signRoomSession } from '@/lib/roomSession';

export async function POST(req: NextRequest) {
  try {
    const { code, payload } = await req.json();
    if (!code || !payload) {
      return NextResponse.json({ error: 'Missing code or payload' }, { status: 400 });
    }
    const { room, participantIndex } = await joinRoom(code, payload);

    const sessionValue = await signRoomSession(code, participantIndex);
    const response = NextResponse.json({ room, participantIndex });
    response.cookies.set(`room_session_${code}`, sessionValue, {
      httpOnly: true,
      path: '/',
      maxAge: 48 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (err: any) {
    console.error('join room:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to join room' }, { status: 500 });
  }
}
