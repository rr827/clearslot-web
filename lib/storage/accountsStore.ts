import { getSupabaseAdminClient } from './supabase';
import type { AppleIdentityClaims } from '../apple';

export interface AccountSessionRecord {
  id: string;
  userId: string;
  revokedAt: string | null;
  expiresAt: string;
  replacedBySessionId: string | null;
}

// Looks up an existing account by Apple's stable sub claim. Returns null if
// this is the first time this Apple ID has signed in to ClearSlot.
export async function findUserIdByAppleSub(sub: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('accounts')
    .select('user_id')
    .eq('provider', 'apple')
    .eq('provider_account_id', sub)
    .maybeSingle();
  return data?.user_id ?? null;
}

// Creates a new user + links the Apple account in one call. Apple only sends
// email/emailVerified on the very first authorization ever, this is that
// first-contact moment, so whatever's on claims here is captured for good.
export async function createUserWithAppleAccount(claims: AppleIdentityClaims): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email: claims.email, email_verified: claims.emailVerified })
    .select('id')
    .single();

  if (userError || !user) {
    throw new Error('Failed to create account');
  }

  const { error: accountError } = await supabase
    .from('accounts')
    .insert({ user_id: user.id, provider: 'apple', provider_account_id: claims.sub });

  if (accountError) {
    // Roll back the orphaned user row rather than leave a user with no
    // linked identity provider.
    await supabase.from('users').delete().eq('id', user.id);
    throw new Error('Failed to link Apple account');
  }

  return user.id;
}

export async function findOrCreateUserForApple(claims: AppleIdentityClaims): Promise<{ userId: string; isNewAccount: boolean }> {
  const existingUserId = await findUserIdByAppleSub(claims.sub);
  if (existingUserId) {
    return { userId: existingUserId, isNewAccount: false };
  }
  const userId = await createUserWithAppleAccount(claims);
  return { userId, isNewAccount: true };
}

export async function createAccountSession(
  userId: string,
  refreshTokenHash: string,
  expiresAt: string,
  deviceLabel?: string
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('account_sessions')
    .insert({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      device_label: deviceLabel ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create account session');
  }
  return data.id;
}

export async function findSessionByRefreshHash(refreshTokenHash: string): Promise<AccountSessionRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('account_sessions')
    .select('id, user_id, revoked_at, expires_at, replaced_by_session_id')
    .eq('refresh_token_hash', refreshTokenHash)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    revokedAt: data.revoked_at,
    expiresAt: data.expires_at,
    replacedBySessionId: data.replaced_by_session_id,
  };
}

export async function markSessionReplaced(sessionId: string, replacedBySessionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from('account_sessions')
    .update({ replaced_by_session_id: replacedBySessionId, last_used_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function revokeAccountSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from('account_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId);
}

// Used when a refresh token is reused after its chain successor already
// exists — a theft signal. Revokes every session for the user, not just the
// one presented, since we can't tell which copy of the token is legitimate.
export async function revokeAllAccountSessions(userId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from('account_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}
