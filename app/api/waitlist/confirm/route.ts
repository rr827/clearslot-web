import { NextRequest, NextResponse } from 'next/server';
import { db, verifyConfirmToken, creditedReferralCount } from '@/lib/waitlist';
import { trackEvent } from '@/lib/analytics';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`waitlist_confirm:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const token = req.nextUrl.searchParams.get('token') ?? '';
  const { valid, id } = verifyConfirmToken(token);

  if (!valid || !id) {
    return NextResponse.redirect(new URL('/waitlist?confirmed=invalid', req.nextUrl.origin));
  }

  const supabase = db();

  const { data: member, error } = await supabase
    .from('waitlist_members')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirm_token: null })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, email, position, referred_by')
    .single();

  if (error || !member) {
    return NextResponse.redirect(new URL('/waitlist?confirmed=already', req.nextUrl.origin));
  }

  // Referral credit
  if (member.referred_by) {
    const { data: referrer } = await supabase
      .from('waitlist_members')
      .select('id')
      .eq('id', member.referred_by)
      .single();

    if (referrer) {
      const creditCount = await creditedReferralCount(referrer.id);
      const excluded = creditCount >= 25;
      const exclusionReason = excluded ? 'cap_reached' : null;

      await supabase.from('waitlist_referral_credits').insert({
        referrer_id: referrer.id,
        referred_id: member.id,
        excluded,
        exclusion_reason: exclusionReason,
      });

      if (!excluded) {
        await supabase.rpc('decrement_waitlist_position', { member_id: referrer.id, amount: 10 });
        trackEvent('waitlist_referral_credited', referrer.id, { referred_id: member.id });
      }
    }
  }

  trackEvent('waitlist_email_confirmed', member.email, { position: member.position });

  return NextResponse.redirect(new URL('/waitlist?confirmed=1', req.nextUrl.origin));
}
