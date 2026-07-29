import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';
import { verifyTurnstileToken, isTurnstileConfigured } from '@/lib/turnstile';
import { db, generateReferralCode, generateConfirmToken } from '@/lib/waitlist';
import { sendEmail } from '@/lib/email';
import { trackEvent } from '@/lib/analytics';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','temp-mail.org','throwam.com','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','dispostable.com','tempmail.com',
  'fakeinbox.com','maildrop.cc','spamgourmet.com','10minutemail.com','getairmail.com',
  'mailnull.com','mailnesia.com','spamfree24.org','emailondeck.com','discard.email',
  'spambog.com','spamhereplease.com','tempinbox.com','throwam.com','mailexpire.com',
  'spamex.com','mytrashmail.com','trashmail.at','trashmail.io','jetable.fr.nf',
  'no-spam.ws','spamgob.com','antispam24.de','byom.de','filzmail.com',
  'gettempmail.com','mobi-trashmail.de','kasmail.com','mailmoat.com','spaml.com',
]);

function isDisposable(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}

function confirmHtml(email: string, position: number, confirmUrl: string, referralUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f9fafb;padding:40px 16px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px 36px;">
  <p style="font-size:28px;font-weight:700;color:#111;margin:0 0 8px">ClearSlot</p>
  <p style="font-size:15px;color:#6b7280;margin:0 0 32px">Founding list confirmation</p>
  <p style="font-size:16px;color:#374151;margin:0 0 8px">Hi ${email} —</p>
  <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 28px">
    Confirm your spot on the ClearSlot founding list. You're currently <strong>#${position}</strong>.
  </p>
  <a href="${confirmUrl}" style="display:inline-block;background:#22C55E;color:#fff;font-weight:600;font-size:16px;padding:14px 28px;border-radius:12px;text-decoration:none;margin-bottom:32px">
    Confirm my founding spot →
  </a>
  <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 16px">
    Move up 10 spots for every friend who joins using your referral link:<br/>
    <a href="${referralUrl}" style="color:#22C55E;word-break:break-all">${referralUrl}</a>
  </p>
  <p style="font-size:12px;color:#d1d5db;margin:0">
    The free tier stays free forever. Founding access is for groups that keep meeting.<br/>
    <a href="${referralUrl.split('/waitlist')[0]}/waitlist/unsubscribe" style="color:#d1d5db">Unsubscribe</a>
  </p>
</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!(await checkRateLimit(`waitlist:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot
  if (body.website) {
    return NextResponse.json({ success: true });
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  if (isDisposable(email)) {
    return NextResponse.json({ error: 'Please use a permanent email address' }, { status: 400 });
  }

  if (!(await checkRateLimit(`waitlist_email:${email}`, 3, 3_600_000))) {
    return NextResponse.json({ error: 'Too many requests for this email' }, { status: 429 });
  }

  // Turnstile
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined;
  if (isTurnstileConfigured()) {
    const ok = await verifyTurnstileToken(turnstileToken, ip);
    if (!ok) return NextResponse.json({ error: 'Bot check failed' }, { status: 400 });
  }

  const supabase = db();

  // Referral attribution
  let referredById: string | null = null;
  const refCode = typeof body.ref === 'string' ? body.ref.trim() : null;
  if (refCode) {
    const { data: referrer } = await supabase
      .from('waitlist_members')
      .select('id')
      .eq('referral_code', refCode)
      .single();
    referredById = referrer?.id ?? null;
  }

  const referralCode = generateReferralCode();

  const { data: member, error } = await supabase
    .from('waitlist_members')
    .insert({
      email,
      referral_code: referralCode,
      referred_by: referredById,
      status: 'pending',
    })
    .select('id, position, referral_code')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('waitlist_members')
        .select('id, position, referral_code')
        .eq('email', email)
        .single();
      if (existing) {
        return NextResponse.json({
          success: true,
          position: existing.position,
          referralCode: existing.referral_code,
        });
      }
    }
    console.error('Waitlist insert error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const confirmToken = generateConfirmToken(member.id);
  await supabase
    .from('waitlist_members')
    .update({ confirm_token: confirmToken })
    .eq('id', member.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clearslot.net';
  const confirmUrl = `${appUrl}/api/waitlist/confirm?token=${encodeURIComponent(confirmToken)}`;
  const referralUrl = `${appUrl}/waitlist?ref=${member.referral_code}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Confirm your ClearSlot founding spot',
      html: confirmHtml(email, member.position, confirmUrl, referralUrl),
    });
  } catch (emailErr) {
    console.error('Confirmation email failed:', emailErr);
    Sentry.captureException(emailErr, { tags: { flow: 'waitlist_confirmation_email' } });
  }

  trackEvent('waitlist_email_submitted', email, { position: member.position, referred: !!referredById });

  return NextResponse.json({
    success: true,
    position: member.position,
    referralCode: member.referral_code,
  });
}
