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

  async updateParticipants(code: string, participants: string[]): Promise<RoomRow> {
    const { data, error } = await getSupabaseAdminClient()
      .from('rooms')
      .update({ participants })
      .eq('code', code)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to update room participants');
    return data as RoomRow;
  }

  async updateProposals(code: string, proposals: Proposal[]): Promise<void> {
    const { error } = await getSupabaseAdminClient()
      .from('rooms')
      .update({ proposals })
      .eq('code', code);

    if (error) throw new Error(error.message);
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
