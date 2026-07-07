import { Suspense } from 'react';
import type { Metadata } from 'next';
import WaitlistForm from './WaitlistForm';

export const metadata: Metadata = {
  title: 'Founding access — ClearSlot',
  description: 'Lock lifetime pricing on persistent groups, recurring rooms, and accountability tools — before anyone else.',
  openGraph: {
    title: 'ClearSlot founding access',
    description: 'Lock lifetime pricing on persistent groups, recurring rooms, and accountability tools — before anyone else.',
    url: 'https://clearslot.net/waitlist',
  },
};

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistForm />
    </Suspense>
  );
}
