import { redirect } from 'next/navigation';

export default function RoomNewPage() {
  redirect('/connect?resume=1');
}
