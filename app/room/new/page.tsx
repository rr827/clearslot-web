'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isConnected } from '@/lib/auth';
import { fetchBusyBlocks, fetchBusyBlocksMicrosoft, BusyBlock } from '@/lib/calendar';
import { encodePayload, AlignedPayload } from '@/lib/payload';
import { format, addDays, differenceInDays } from 'date-fns';

// Post-OAuth bridge page.
// /api/auth/google/callback redirects here (returnTo: /room/new).
// Reads questionnaire + action from sessionStorage, fetches calendar blocks
// via the server-side proxy, encodes the payload, then creates or joins a room.

export default function RoomNewPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!isConnected()) { router.replace('/connect'); return; }

      const qRaw = sessionStorage.getItem('aligned_questionnaire');
      const action = sessionStorage.getItem('aligned_room_action') ?? 'create';
      sessionStorage.removeItem('aligned_questionnaire');
      sessionStorage.removeItem('aligned_room_action');

      const q = qRaw ? JSON.parse(qRaw) : null;
      const range: { start: string; end: string } = q?.range ?? {
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      };

      const daysAhead = Math.max(
        14,
        differenceInDays(new Date(range.end + 'T23:59'), new Date()) + 1
      );

      const provider = sessionStorage.getItem('aligned_provider') ?? 'google';
      sessionStorage.removeItem('aligned_provider');

      let blocks: BusyBlock[];
      try {
        if (provider === 'ics') {
          const raw = sessionStorage.getItem('aligned_ics_blocks');
          sessionStorage.removeItem('aligned_ics_blocks');
          blocks = raw ? JSON.parse(raw) : [];
        } else if (provider === 'microsoft') {
          blocks = await fetchBusyBlocksMicrosoft(daysAhead);
        } else {
          blocks = await fetchBusyBlocks(daysAhead);
        }
      } catch {
        blocks = [];
      }

      const payload: AlignedPayload = {
        range,
        sleep: q?.sleep ?? null,
        preference: q?.preference ?? null,
        blocks,
        blocked: q?.blocked ?? null,
      };

      const encoded = encodePayload(payload);

      if (action.startsWith('join:')) {
        const code = action.slice(5);
        const res = await fetch('/api/room/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, payload: encoded }),
        });
        if (res.ok) {
          const { room } = await res.json();
          localStorage.setItem(`room_${code}`, String(room.participants.length - 1));
          router.replace(`/room/${code}`);
        } else {
          router.replace(`/room/${code}?error=join_failed`);
        }
      } else {
        const res = await fetch('/api/room/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: encoded }),
        });
        if (res.ok) {
          const { code } = await res.json();
          localStorage.setItem(`room_${code}`, '0');
          router.replace(`/room/${code}`);
        } else {
          router.replace('/connect?error=room_failed');
        }
      }
    })();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 14, color: '#6B7280' }}>Setting up your room…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
