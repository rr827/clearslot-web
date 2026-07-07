import { redirect } from 'next/navigation';

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/waitlist?confirmed=invalid');
  }

  redirect(`/api/waitlist/confirm?token=${encodeURIComponent(token)}`);
}
