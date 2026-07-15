import { getSupabaseAdminClient } from './storage/supabase';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export interface RoomNotificationTarget {
  room_code: string;
  participant_index: number;
  expo_push_token: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

function isExpoPushToken(value: string): boolean {
  return /^ExponentPushToken\[[^\]]+\]$/.test(value) || /^ExpoPushToken\[[^\]]+\]$/.test(value);
}

export async function upsertRoomNotificationTarget(input: {
  roomCode: string;
  participantIndex: number;
  expoPushToken: string;
  expiresAt: string;
}): Promise<void> {
  if (!isExpoPushToken(input.expoPushToken)) {
    throw new Error('Invalid Expo push token');
  }

  const { error } = await getSupabaseAdminClient()
    .from('room_notification_targets')
    .upsert(
      {
        room_code: input.roomCode,
        participant_index: input.participantIndex,
        expo_push_token: input.expoPushToken,
        expires_at: input.expiresAt,
      },
      {
        onConflict: 'room_code,participant_index',
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getRoomNotificationTarget(
  roomCode: string,
  participantIndex: number
): Promise<RoomNotificationTarget | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from('room_notification_targets')
    .select('*')
    .eq('room_code', roomCode)
    .eq('participant_index', participantIndex)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as RoomNotificationTarget | null) ?? null;
}

export async function sendRoomNotification(input: {
  expoPushToken: string;
  title: string;
  body: string;
  roomCode: string;
}): Promise<void> {
  if (!isExpoPushToken(input.expoPushToken)) return;

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.expoPushToken,
      title: input.title,
      body: input.body,
      sound: 'default',
      data: {
        roomCode: input.roomCode,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }
}
