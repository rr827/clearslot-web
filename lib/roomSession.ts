// HMAC-signed room session cookie helper.
// Cookie value format: "{participantIndex}.{hexSignature}"
// Signature = HMAC-SHA256 of "{code}:{participantIndex}" using ROOM_SESSION_SECRET.

const SECRET = process.env.ROOM_SESSION_SECRET ?? '';

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signRoomSession(code: string, participantIndex: number): Promise<string> {
  const key = await getKey();
  const data = new TextEncoder().encode(`${code}:${participantIndex}`);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return `${participantIndex}.${bufToHex(sig)}`;
}

export async function verifyRoomSession(
  code: string,
  cookieValue: string | undefined
): Promise<number | null> {
  if (!cookieValue || !SECRET) return null;
  const dotIdx = cookieValue.indexOf('.');
  if (dotIdx < 0) return null;

  const indexStr = cookieValue.slice(0, dotIdx);
  const hexSig = cookieValue.slice(dotIdx + 1);
  const participantIndex = Number(indexStr);
  if (!Number.isInteger(participantIndex) || participantIndex < 0) return null;

  const key = await getKey();
  const data = new TextEncoder().encode(`${code}:${participantIndex}`);
  const expected = await crypto.subtle.sign('HMAC', key, data);
  if (bufToHex(expected) !== hexSig) return null;

  return participantIndex;
}
