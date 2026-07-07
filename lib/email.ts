import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'waitlist@clearslot.net';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email provider not configured');
  }
  return new Resend(apiKey);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
