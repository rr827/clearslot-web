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
  if (new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function joinRoom(
  code: string,
  encodedPayload: string
): Promise<{ room: RoomRow; participantIndex: number }> {
  validatePayload(encodedPayload);
  const roomStore = getRoomStore();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  if (room.participants.length >= MAX_PARTICIPANTS)
    throw new Error('Room is full');

  // Duplicate detection: if incoming payload has a uid, check if it's already in the room
  try {
    const incoming = decodePayload(encodedPayload);
    if (incoming.uid) {
      const existingIdx = room.participants.findIndex((p) => {
        try { return decodePayload(p).uid === incoming.uid; } catch { return false; }
      });
      if (existingIdx !== -1) {
        return { room, participantIndex: existingIdx };
      }
    }
  } catch {
    // If decode fails, proceed normally
  }

  const data = await roomStore.updateParticipants(code.toUpperCase(), [...room.participants, encodedPayload]);
  return { room: data, participantIndex: data.participants.length - 1 };
}

export async function updateParticipantPayload(
  code: string,
  participantIndex: number,
  encodedPayload: string
): Promise<RoomRow> {
  validatePayload(encodedPayload);
  const roomStore = getRoomStore();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  if (participantIndex < 0 || participantIndex >= room.participants.length) {
    throw new Error('Invalid participant');
  }

  const participants = [...room.participants];
  participants[participantIndex] = encodedPayload;

  return roomStore.updateParticipants(code.toUpperCase(), participants);
}

export async function proposeTime(
  code: string,
  proposerIndex: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const roomStore = getRoomStore();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');

  if (proposerIndex < 0 || proposerIndex >= room.participants.length)
    throw new Error('Invalid participant');

  if (room.proposals.length >= 50) throw new Error('Too many proposals in this room');

  // Deduplicate: don't add an identical pending proposal
  const duplicate = room.proposals.some(
    (p) => p.start_time === startTime && p.end_time === endTime && p.status === 'pending'
  );
  if (duplicate) throw new Error('This time has already been proposed');

  const proposal: Proposal = {
    proposer_index: proposerIndex,
    start_time: startTime,
    end_time: endTime,
    status: 'pending',
  };

  await roomStore.updateProposals(code.toUpperCase(), [...room.proposals, proposal]);
}

export async function acceptProposal(code: string, proposalIndex: number): Promise<void> {
  const roomStore = getRoomStore();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  if (proposalIndex < 0 || proposalIndex >= room.proposals.length)
    throw new Error('Invalid proposal');
  if (room.proposals[proposalIndex].status !== 'pending')
    throw new Error('Proposal is no longer pending');
  const updated = room.proposals.map((p, i) =>
    i === proposalIndex ? { ...p, status: 'accepted' as const } : p
  );
  await roomStore.updateProposals(code.toUpperCase(), updated);
}

export async function declineProposal(code: string, proposalIndex: number): Promise<void> {
  const roomStore = getRoomStore();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  if (proposalIndex < 0 || proposalIndex >= room.proposals.length)
    throw new Error('Invalid proposal');
  if (room.proposals[proposalIndex].status !== 'pending')
    throw new Error('Proposal is no longer pending');
  const updated = room.proposals.map((p, i) =>
    i === proposalIndex ? { ...p, status: 'declined' as const } : p
  );
  await roomStore.updateProposals(code.toUpperCase(), updated);
}

export type { Proposal, RoomRow } from './storage/types';

export async function getProposal(code: string, proposalIndex: number): Promise<Proposal> {
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  const proposal = room.proposals[proposalIndex];
  if (!proposal) throw new Error('Invalid proposal');
  return proposal;
}
