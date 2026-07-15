import { NextRequest, NextResponse } from 'next/server';
import { declineProposal, getProposal } from '@/lib/room';
import { getRoomNotificationTarget, sendRoomNotification } from '@/lib/roomNotifications';
import { getRoomSessionToken, verifyRoomSession } from '@/lib/roomSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { code, proposalIndex } = body ?? {};
    if (typeof code !== 'string' || !Number.isInteger(proposalIndex)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = getRoomSessionToken(req, code);
    const declinerIndex = await verifyRoomSession(code, token);
    if (declinerIndex === null) {
      return NextResponse.json({ error: 'Not authenticated for this room' }, { status: 401 });
    }

    const rateKey = `room_decline:${code.toUpperCase()}:${declinerIndex}`;
    if (!(await checkRateLimit(rateKey, 30, 60_000))) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const proposal = await getProposal(code, proposalIndex);
    await declineProposal(code, proposalIndex);

    if (proposal.proposer_index !== declinerIndex) {
      try {
        const target = await getRoomNotificationTarget(code.toUpperCase(), proposal.proposer_index);
        if (target) {
          await sendRoomNotification({
            expoPushToken: target.expo_push_token,
            roomCode: code.toUpperCase(),
            title: 'Proposal declined',
            body: `Your proposed time for ${format(new Date(proposal.start_time), 'EEE MMM d · h:mm a')} was declined.`,
          });
        }
      } catch (notifyErr) {
        console.error('decline proposal notification:', notifyErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('decline proposal:', err);
    if (err?.message === 'Room not found') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err?.message === 'Invalid proposal') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err?.message === 'Proposal is no longer pending') {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? 'Failed to decline' }, { status: 500 });
  }
}
