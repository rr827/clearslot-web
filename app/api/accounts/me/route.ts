import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { getAccountAccessToken, verifyAccessToken, type AccessTokenClaims } from '@/lib/accountSession';
import { getUserById, deleteUser } from '@/lib/storage/accountsStore';
import { deleteRevenueCatSubscriber } from '@/lib/revenuecat';

async function requireAuth(req: NextRequest): Promise<AccessTokenClaims | null> {
  const token = getAccountAccessToken(req);
  return token ? verifyAccessToken(token) : null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`account_me:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const claims = await requireAuth(req);
  if (!claims) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await getUserById(claims.userId);
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// App Store Guideline 5.1.1(v): in-app account deletion is required once
// account creation exists, not just a support-email path.
export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`account_me_delete:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const claims = await requireAuth(req);
  if (!claims) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // RevenueCat first. If this fails, the local account still exists and the
  // request can be safely retried — deleting the local user row first and
  // having the RevenueCat call fail after would leave an orphaned
  // subscriber record with no way to look it back up (users.id, the only
  // key RevenueCat is indexed by here, would be gone).
  try {
    await deleteRevenueCatSubscriber(claims.userId);
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete subscription data, please try again' },
      { status: 500 }
    );
  }

  // Every other Phase 2 table cascades from users.id via ON DELETE CASCADE
  // (accounts, account_sessions, groups, group_members, account_claimed_rooms,
  // account_calendar_connections, account_availability_cache) — this one
  // delete is sufficient, Postgres handles the rest.
  await deleteUser(claims.userId);

  return NextResponse.json({ success: true });
}
