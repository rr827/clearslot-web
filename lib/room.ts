import { createClient } from '@supabase/supabase-js';
import { decodePayload } from './payload';

export interface Proposal {
  proposer_index: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface RoomRow {
  code: string;
  expires_at: string;
  participants: string[]; // encoded AlignedPayload strings
  proposals: Proposal[];
  created_at: string;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_PAYLOAD_BYTES = 25_000;
export const MAX_PARTICIPANTS = 10;
const VALID_CODE = /^[A-Z2-9]{6}$/;

function validateCode(code: string): string {
  const upper = code.toUpperCase().trim();
  if (!VALID_CODE.test(upper)) throw new Error('Invalid room code');
  return upper;
}

function validatePayload(encodedPayload: string): void {
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
  const supabase = db();
  const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase.from('rooms').insert({
      code,
      expires_at,
      participants: [encodedPayload],
      proposals: [],
    });
    if (!error) return code;
    // 23505 = unique constraint violation — retry with a new code
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Could not generate a unique room code');
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const { data, error } = await db()
    .from('rooms')
    .select('*')
    .eq('code', validateCode(code))
    .single();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data as RoomRow;
}

export async function joinRoom(
  code: string,
  encodedPayload: string
): Promise<{ room: RoomRow; participantIndex: number }> {
  validatePayload(encodedPayload);
  const supabase = db();
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

  const { data, error } = await supabase
    .from('rooms')
    .update({ participants: [...room.participants, encodedPayload] })
    .eq('code', code.toUpperCase())
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to join room');
  return { room: data as RoomRow, participantIndex: (data as RoomRow).participants.length - 1 };
}

export async function proposeTime(
  code: string,
  proposerIndex: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const supabase = db();
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

  const { error } = await supabase
    .from('rooms')
    .update({ proposals: [...room.proposals, proposal] })
    .eq('code', code.toUpperCase());
  if (error) throw new Error(error.message);
}

export async function acceptProposal(code: string, proposalIndex: number): Promise<void> {
  const supabase = db();
  const room = await getRoom(code);
  if (!room) throw new Error('Room not found');
  if (proposalIndex < 0 || proposalIndex >= room.proposals.length)
    throw new Error('Invalid proposal');
  const updated = room.proposals.map((p, i) =>
    i === proposalIndex ? { ...p, status: 'accepted' as const } : p
  );
  const { error } = await supabase
    .from('rooms')
    .update({ proposals: updated })
    .eq('code', code.toUpperCase());
  if (error) throw new Error(error.message);
}
