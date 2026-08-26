import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { signAppleNonce, requireAccountSessionSecret } from '@/lib/accountSession';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`apple_nonce:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    requireAccountSessionSecret();
  } catch {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  const nonce = await signAppleNonce();
  return NextResponse.json({ nonce });
}
