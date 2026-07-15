import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/waitlist';
import { trackEvent } from '@/lib/analytics';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`waitlist_intent:${ip}`, 6, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let body: { referralCode?: string; answer?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { referralCode, answer } = body;

  if (!referralCode || typeof answer !== 'number' || !Number.isInteger(answer) || answer < 1 || answer > 5) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data: member, error } = await db()
    .from('waitlist_members')
    .update({ intent_answer: answer })
    .eq('referral_code', referralCode)
    .select('email')
    .single();

  if (error || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  trackEvent('waitlist_intent_answered', member.email, { answer });

  return NextResponse.json({ success: true });
}
