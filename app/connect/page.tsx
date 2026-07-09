import ConnectClient from './ConnectClient';

const CONNECT_ERROR_CODES = new Set([
  'oauth_denied',
  'invalid_state',
  'token_exchange',
  'server',
  'calendar_fetch_failed',
  'service_misconfigured',
  'payload_too_large',
  'room_failed',
  'join_failed',
  'auth_required',
] as const);

type ConnectErrorCode = typeof CONNECT_ERROR_CODES extends Set<infer T> ? T : never;

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{
    room?: string | string[];
    edit?: string | string[];
    error?: string | string[];
    resume?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const room = firstValue(params.room);
  const edit = firstValue(params.edit);
  const error = firstValue(params.error);
  const resume = firstValue(params.resume);

  const initialErrorCode = CONNECT_ERROR_CODES.has(error as ConnectErrorCode)
    ? (error as ConnectErrorCode)
    : null;

  return (
    <ConnectClient
      initialRoomCode={room ? room.toUpperCase() : null}
      initialIsEditing={edit === '1'}
      initialErrorCode={initialErrorCode}
      initialResume={resume === '1'}
    />
  );
}
