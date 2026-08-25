import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'crypto';

// Account sessions are a deliberately different design from lib/roomSession.ts:
// room sessions are stateless HMAC tokens with no expiry claim and no way to
// revoke a single one short of rotating the secret for everyone. An account
// credential's blast radius (every group ever saved) is categorically larger
// than one room's bearer token, so this gets real revocation: a short-lived
// signed access token plus a DB-backed, rotating opaque refresh token.

const ACCESS_TOKEN_SECRET = process.env.ACCOUNT_SESSION_SECRET ?? '';
const ACCESS_TOKEN_TTL = '15m';

export function requireAccountSessionSecret(): void {
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error('ACCOUNT_SESSION_SECRET is not configured');
  }
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(ACCESS_TOKEN_SECRET);
}

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

export async function signAccessToken(userId: string, sessionId: string): Promise<string> {
  requireAccountSessionSecret();
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(signingKey());
}

// Returns null on any failure (expired, malformed, wrong signature) rather
// than throwing — callers treat a failed verify as "not authenticated", not
// a server error.
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  if (!ACCESS_TOKEN_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export function getAccountAccessToken(req: { headers: { get(name: string): string | null } }): string | undefined {
  const authHeader = req.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

// Opaque refresh token — random, returned to the client once at issuance,
// only its hash is ever stored in account_sessions.refresh_token_hash.
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
