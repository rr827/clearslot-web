import { SupabaseRoomStore } from './supabase-room-store';
import type { RoomStore } from './types';

let roomStore: RoomStore | null = null;

export function getRoomStore(): RoomStore {
  if (!roomStore) {
    roomStore = new SupabaseRoomStore();
  }
  return roomStore;
}
