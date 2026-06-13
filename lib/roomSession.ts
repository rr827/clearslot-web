// HMAC-signed room session helper.
// Token format: "{participantIndex}.{hexSignature}"
// Signature = HMAC-SHA256 of "{code}:{participantIndex}" using ROOM_SESSION_SECRET.
// Carried either as the room_session_<code> httpOnly cookie (web) or an
// Authorization: Bearer header (mobile).

import type { NextRequest } from 'next/server';

const SECRET = process.env.ROOM_SESSION_SECRET ?? '';

// Call from any route that signs or verifies room sessions so misconfiguration
// (missing secret in prod) surfaces as an explicit 5xx instead of a silent
// "no session" downgrade that would make every request look unauthenticated.
export function requireSessionSecret(): void {
  if (!SECRET) {
    throw new Error('ROOM_SESSION_SECRET is not configured');
  }
}

// Extracts a room session token from the Authorization: Bearer header (mobile)
// or the room_session_<code> cookie (web).
export function getRoomSessionToken(req: NextRequest, code: string): string | undefined {
  const authHeader = req.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  return bearer ?? req.cookies.get(`room_session_${code}`)?.value;
}

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

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

export async function signRoomSession(code: string, participantIndex: number): Promise<string> {
  const key = await getKey();
  const data = new TextEncoder().encode(`${code}:${participantIndex}`);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return `${participantIndex}.${bufToHex(sig)}`;
}

export async function verifyRoomSession(
  code: string,
  token: string | undefined
): Promise<number | null> {
  if (!token || !SECRET) return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx < 0) return null;

  const indexStr = token.slice(0, dotIdx);
  const hexSig = token.slice(dotIdx + 1);
  const participantIndex = Number(indexStr);
  if (!Number.isInteger(participantIndex) || participantIndex < 0) return null;

  if (hexSig.length % 2 !== 0) return null;
  const key = await getKey();
  const data = new TextEncoder().encode(`${code}:${participantIndex}`);
  const valid = await crypto.subtle.verify('HMAC', key, hexToBuffer(hexSig), data);
  if (!valid) return null;

  return participantIndex;
}
