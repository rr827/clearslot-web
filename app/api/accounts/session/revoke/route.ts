import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { getAccountAccessToken, verifyAccessToken } from '@/lib/accountSession';
import { revokeAccountSession } from '@/lib/storage/accountsStore';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`account_session_revoke:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const token = getAccountAccessToken(req);
  const claims = token ? await verifyAccessToken(token) : null;
  if (!claims) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await revokeAccountSession(claims.sessionId);
  return NextResponse.json({ success: true });
}
