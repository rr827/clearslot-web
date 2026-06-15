import type { NextRequest } from 'next/server';

/**
 * Vercel's edge network sets `x-real-ip` to the true client address and
 * strips/overwrites any client-supplied value, so it can't be spoofed.
 * `x-forwarded-for` can contain attacker-controlled entries prepended
 * before the real IP, so it's only used as a fallback for non-Vercel
 * environments (e.g. local dev).
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return 'unknown';
}
