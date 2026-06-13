import { NextRequest, NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room';
import { signRoomSession, requireSessionSecret } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!(await checkRateLimit(`room_join:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    requireSessionSecret();
    const { code, payload } = await req.json();
    if (!code || !payload) {
      return NextResponse.json({ error: 'Missing code or payload' }, { status: 400 });
    }
    const { room, participantIndex } = await joinRoom(code, payload);

    const sessionValue = await signRoomSession(code, participantIndex);
    const response = NextResponse.json({ room, participantIndex, sessionToken: sessionValue });
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
    if (err?.message === 'ROOM_SESSION_SECRET is not configured') {
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to join room' }, { status: 500 });
  }
}
