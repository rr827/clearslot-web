import { getSupabaseAdminClient } from './supabase';
import type { Proposal, RoomRow, RoomStore } from './types';

export class SupabaseRoomStore implements RoomStore {
  async createRoom(input: {
    code: string;
    expiresAt: string;
    participants: string[];
    proposals: Proposal[];
  }): Promise<void> {
    const { error } = await getSupabaseAdminClient().from('rooms').insert({
      code: input.code,
      expires_at: input.expiresAt,
      participants: input.participants,
      proposals: input.proposals,
    });

    if (error) throw error;
  }

  async getRoom(code: string): Promise<RoomRow | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) return null;
    return data as RoomRow;
  }

  async joinRoomAtomic(code: string, payload: string, maxParticipants: number): Promise<RoomRow> {
    const { data, error } = await getSupabaseAdminClient().rpc('join_room_atomic', {
      p_code: code,
      p_payload: payload,
      p_max_participants: maxParticipants,
    });

    if (error || !data) throw new Error(error?.message ?? 'Failed to join room');
    return (Array.isArray(data) ? data[0] : data) as RoomRow;
  }

  async updateParticipantPayloadAtomic(code: string, participantIndex: number, payload: string): Promise<RoomRow> {
    const { data, error } = await getSupabaseAdminClient().rpc('update_participant_payload_atomic', {
      p_code: code,
      p_participant_index: participantIndex,
      p_payload: payload,
    });

    if (error || !data) throw new Error(error?.message ?? 'Failed to update participant');
    return (Array.isArray(data) ? data[0] : data) as RoomRow;
  }

  async appendProposalAtomic(code: string, proposerIndex: number, startTime: string, endTime: string): Promise<RoomRow> {
    const { data, error } = await getSupabaseAdminClient().rpc('append_proposal_atomic', {
      p_code: code,
      p_proposer_index: proposerIndex,
      p_start_time: startTime,
      p_end_time: endTime,
    });

    if (error || !data) throw new Error(error?.message ?? 'Failed to add proposal');
    return (Array.isArray(data) ? data[0] : data) as RoomRow;
  }

  async setProposalStatusAtomic(code: string, proposalIndex: number, status: 'accepted' | 'declined'): Promise<RoomRow> {
    const { data, error } = await getSupabaseAdminClient().rpc('set_proposal_status_atomic', {
      p_code: code,
      p_proposal_index: proposalIndex,
      p_new_status: status,
    });

    if (error || !data) throw new Error(error?.message ?? 'Failed to update proposal');
    return (Array.isArray(data) ? data[0] : data) as RoomRow;
  }

  async deleteExpiredRooms(beforeIso: string): Promise<number> {
    const { data, error } = await getSupabaseAdminClient()
      .from('rooms')
      .delete()
      .lt('expires_at', beforeIso)
      .select('code');

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }
}
