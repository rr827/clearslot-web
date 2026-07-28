import { decodePayload } from './payload';
import { getRoomStore } from './storage';
import type { Proposal, RoomRow } from './storage/types';

const MAX_PAYLOAD_BYTES = 25_000;
export const MAX_PARTICIPANTS = 10;
const VALID_CODE = /^[A-Z2-9]{6}$/;

function validateCode(code: string): string {
  const upper = code.toUpperCase().trim();
  if (!VALID_CODE.test(upper)) throw new Error('Invalid room code');
  return upper;
}

function validatePayload(encodedPayload: string): void {
  if (typeof encodedPayload !== 'string' || encodedPayload.length === 0)
    throw new Error('Invalid payload');
  if (encodedPayload.length > MAX_PAYLOAD_BYTES)
    throw new Error('Payload too large');
}

function generateCode(): string {
  // Exclude ambiguous chars (0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export async function createRoom(encodedPayload: string): Promise<string> {
  validatePayload(encodedPayload);
  const roomStore = getRoomStore();
  const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await roomStore.createRoom({
        code,
        expiresAt: expires_at,
        participants: [encodedPayload],
        proposals: [],
      });
      return code;
    } catch (error: any) {
      // 23505 = unique constraint violation — retry with a new code
      if (error?.code !== '23505') throw new Error(error?.message ?? 'Failed to create room');
    }
  }
  throw new Error('Could not generate a unique room code');
}

// Deletes all rooms past their expires_at. Returns the number of rows deleted.
export async function deleteExpiredRooms(): Promise<number> {
  return getRoomStore().deleteExpiredRooms(new Date().toISOString());
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const data = await getRoomStore().getRoom(validateCode(code));
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    // Opportunistic cleanup: don't block this read on the sweep.
    deleteExpiredRooms().catch((err) => {
      console.error('Opportunistic expired-room cleanup failed:', err);
    });
    return null;
  }
  return data;
}

export async function joinRoom(
  code: string,
  encodedPayload: string
): Promise<{ room: RoomRow; participantIndex: number }> {
  validatePayload(encodedPayload);
  const roomStore = getRoomStore();
  const upperCode = code.toUpperCase();

  // Duplicate detection: if incoming payload has a uid, check if it's already in the room.
  // Best-effort/non-atomic — the same person double-submitting from two tabs is
  // low-stakes compared to the cross-participant race the atomic join below closes.
  try {
    const incoming = decodePayload(encodedPayload);
    if (incoming.uid) {
      const room = await getRoom(upperCode);
      if (room) {
        const existingIdx = room.participants.findIndex((p) => {
          try { return decodePayload(p).uid === incoming.uid; } catch { return false; }
        });
        if (existingIdx !== -1) {
          return { room, participantIndex: existingIdx };
        }
      }
      // If room is null here, fall through — joinRoomAtomic below will
      // throw its own 'Room not found' error.
    }
  } catch {
    // If decode fails, proceed normally
  }

  const data = await roomStore.joinRoomAtomic(upperCode, encodedPayload, MAX_PARTICIPANTS);
  return { room: data, participantIndex: data.participants.length - 1 };
}

export async function updateParticipantPayload(
  code: string,
  participantIndex: number,
  encodedPayload: string
): Promise<RoomRow> {
  validatePayload(encodedPayload);
  const roomStore = getRoomStore();
  return roomStore.updateParticipantPayloadAtomic(code.toUpperCase(), participantIndex, encodedPayload);
}

export async function proposeTime(
  code: string,
  proposerIndex: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const roomStore = getRoomStore();
  await roomStore.appendProposalAtomic(code.toUpperCase(), proposerIndex, startTime, endTime);
}

export async function acceptProposal(code: string, proposalIndex: number): Promise<void> {
  const roomStore = getRoomStore();
  await roomStore.setProposalStatusAtomic(code.toUpperCase(), proposalIndex, 'accepted');
}

export async function declineProposal(code: string, proposalIndex: number): Promise<void> {
  const roomStore = getRoomStore();
  await roomStore.setProposalStatusAtomic(code.toUpperCase(), proposalIndex, 'declined');
}

export type { Proposal, RoomRow } from './storage/types';

export async function getProposal(code: string, proposalIndex: number): Promise<Proposal> {
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  const proposal = room.proposals[proposalIndex];
  if (!proposal) throw new Error('Invalid proposal');
  return proposal;
}
