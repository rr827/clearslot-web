export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? '';

export function isTurnstileConfigured(): boolean {
  return Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteip: string
): Promise<boolean> {
  if (!isTurnstileConfigured()) return true;
  if (!token) return false;

  const body = new URLSearchParams({
    secret: TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (remoteip && remoteip !== 'unknown') {
    body.set('remoteip', remoteip);
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return Boolean(data?.success);
}
