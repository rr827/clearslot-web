import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_TOKEN_ENDPOINT = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

const APPLE_TEAM_ID = process.env.APPLE_SIWA_TEAM_ID ?? '';
const APPLE_KEY_ID = process.env.APPLE_SIWA_KEY_ID ?? '';
const APPLE_PRIVATE_KEY = process.env.APPLE_SIWA_PRIVATE_KEY ?? '';

// Cached across requests — createRemoteJWKSet handles Apple's own key
// rotation and respects their Cache-Control headers internally, no manual
// refresh logic needed here.
const appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

export function requireAppleSiwaCredentials(): void {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error('Apple Sign in with Apple credentials are not configured (APPLE_SIWA_TEAM_ID/KEY_ID/PRIVATE_KEY)');
  }
}

export interface AppleIdentityClaims {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

// Verifies an Apple-issued identity token's signature against Apple's own
// rotating JWKS, and checks iss/aud/exp. Never trust a client-asserted
// identity — this (or the code-exchange path below) is the only source of
// truth for who actually signed in. clientId is net.clearslot.app for the
// native mobile flow; the web flow will use a separate Services ID once
// registered (see Apple identity token verification section of the plan).
export async function verifyAppleIdentityToken(
  identityToken: string,
  clientId: string,
  expectedNonce?: string
): Promise<AppleIdentityClaims> {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: APPLE_ISSUER,
    audience: clientId,
  });

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('Apple identity token nonce mismatch');
  }

  if (typeof payload.sub !== 'string') {
    throw new Error('Apple identity token missing sub claim');
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
  };
}

// Mints the client_secret JWT Apple's token endpoint requires for a code
// exchange. Not a stored secret — signed fresh per request from the Sign in
// with Apple private key (the .p8 file from the Apple Developer portal).
async function mintAppleClientSecret(clientId: string): Promise<string> {
  requireAppleSiwaCredentials();
  const privateKey = await importPKCS8(APPLE_PRIVATE_KEY, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID })
    .setIssuer(APPLE_TEAM_ID)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience(APPLE_ISSUER)
    .setSubject(clientId)
    .sign(privateKey);
}

// Exchanges the client's authorizationCode server-side for an Apple-attested
// identity token — preferred over trusting the client-supplied identity
// token alone, since a successful exchange proves the code is genuine and
// fresh. Used for both the native mobile flow and (once registered) the web
// flow, with clientId varying by platform.
export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
  clientId: string,
  expectedNonce?: string
): Promise<AppleIdentityClaims> {
  const clientSecret = await mintAppleClientSecret(clientId);

  const res = await fetch(APPLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!res.ok) {
    throw new Error('Apple authorization code exchange failed');
  }

  const data = await res.json();
  if (typeof data.id_token !== 'string') {
    throw new Error('Apple token response missing id_token');
  }

  return verifyAppleIdentityToken(data.id_token, clientId, expectedNonce);
}
