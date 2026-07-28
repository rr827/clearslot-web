export interface Proposal {
  proposer_index: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface RoomRow {
  code: string;
  expires_at: string;
  participants: string[];
  proposals: Proposal[];
  created_at: string;
}

export interface RoomStore {
  createRoom(input: {
    code: string;
    expiresAt: string;
    participants: string[];
    proposals: Proposal[];
  }): Promise<void>;
  getRoom(code: string): Promise<RoomRow | null>;
  deleteExpiredRooms(beforeIso: string): Promise<number>;
  // These four all run as a single atomic operation inside Postgres (see the
  // *_atomic SQL functions) instead of a JS read-then-write pair, so two
  // concurrent calls on the same room can't silently overwrite each other.
  joinRoomAtomic(code: string, payload: string, maxParticipants: number): Promise<RoomRow>;
  updateParticipantPayloadAtomic(code: string, participantIndex: number, payload: string): Promise<RoomRow>;
  appendProposalAtomic(code: string, proposerIndex: number, startTime: string, endTime: string): Promise<RoomRow>;
  setProposalStatusAtomic(code: string, proposalIndex: number, status: 'accepted' | 'declined'): Promise<RoomRow>;
}
