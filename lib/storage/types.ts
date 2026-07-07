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
  updateParticipants(code: string, participants: string[]): Promise<RoomRow>;
  updateProposals(code: string, proposals: Proposal[]): Promise<void>;
  deleteExpiredRooms(beforeIso: string): Promise<number>;
}
