import type { Metadata } from 'next';
import WaitlistForm from './WaitlistForm';

export const metadata: Metadata = {
  title: 'ClearSlot — Private Availability Sharing',
  description: 'Find mutual free time without sharing your calendar. No accounts. No event details transmitted. Coming soon.',
  openGraph: {
    title: 'ClearSlot',
    description: 'Find mutual free time without sharing your calendar.',
    url: 'https://clearslot.net',
  },
};

export default function WaitlistPage() {
  return <WaitlistForm />;
}
