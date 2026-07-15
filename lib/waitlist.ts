import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function generateReferralCode(): string {
  return randomBytes(6).toString('base64url').slice(0, 8);
}

function confirmSecret(): string {
  const secret = process.env.WAITLIST_CONFIRM_SECRET;
  if (!secret) {
    throw new Error('WAITLIST_CONFIRM_SECRET is not set');
  }
  return secret;
}

export function generateConfirmToken(id: string): string {
  const sig = createHmac('sha256', confirmSecret()).update(id).digest('hex');
  return `${id}.${sig}`;
}

export function verifyConfirmToken(token: string): { valid: boolean; id: string } {
  const dot = token.indexOf('.');
  if (dot === -1) return { valid: false, id: '' };
  const id = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = createHmac('sha256', confirmSecret()).update(id).digest('hex');
  try {
    const valid = timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
    return { valid, id };
  } catch {
    return { valid: false, id: '' };
  }
}

export async function creditedReferralCount(referrerId: string): Promise<number> {
  const { count } = await db()
    .from('waitlist_referral_credits')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('excluded', false);
  return count ?? 0;
}
