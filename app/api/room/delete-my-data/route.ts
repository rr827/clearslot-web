import { NextRequest, NextResponse } from 'next/server';
import { encodePayload } from '@/lib/payload';
import { updateParticipantPayload } from '@/lib/room';
import { deleteRoomNotificationTargetByParticipant } from '@/lib/roomNotifications';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

// Server-defined, not client-supplied — guarantees a caller can't smuggle
// real data through disguised as a "deletion" request. Matches the app's
// existing empty-payload shape (the same fallback decodePayload already
// returns on a failed decode), so every existing renderer already knows how
// to handle it safely.
const EMPTY_PAYLOAD = encodePayload({
  range: { start: '', end: '' },
  sleep: null,
  preference: null,
  includeAllDay: true,
  blocks: [],
  blocked: null,
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`room_delete_my_data:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    const body = await req.json().catch(() => null);
    const code = body?.code;
    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }
    const normalizedCode = code.toUpperCase();

    const token = getRoomSessionToken(req, normalizedCode);
    const participantIndex = await verifyRoomSession(normalizedCode, token);
    if (participantIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    await updateParticipantPayload(normalizedCode, participantIndex, EMPTY_PAYLOAD);

    try {
      await deleteRoomNotificationTargetByParticipant(normalizedCode, participantIndex);
    } catch (notifyErr) {
      // Best-effort — the payload scrub above is the part that actually
      // matters; a stale notification-target row with no personal data left
      // to notify about isn't worth failing the whole request over.
      console.error('delete-my-data: failed to clear notification target:', notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('delete my data:', err);
    if (err?.message === 'Room not found') {
      // Already gone — from the caller's perspective, the goal is achieved.
      return NextResponse.json({ ok: true });
    }
    if (err?.message === 'Invalid participant') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message ?? 'Failed to delete data' }, { status: 500 });
  }
}
