import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'waitlist@clearslot.net';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
