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

function Sk({ w, h, r = 6, style }: { w?: string | number; h: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: w ?? '100%',
        height: h,
        borderRadius: r,
        background:
          'linear-gradient(90deg, rgba(225,225,220,0.9) 0%, rgba(241,241,236,0.95) 50%, rgba(225,225,220,0.9) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skshimmer 1.25s linear infinite',
        ...style,
      }}
    />
  );
}

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
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <style>{`@keyframes skshimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>

      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '0 28px', height: 86, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Sk w={96} h={22} />
        <Sk w={130} h={34} r={10} />
        <div style={{ display: 'flex' }}>
          {[0, 1].map((i) => <Sk key={i} w={24} h={24} r={12} style={{ marginLeft: i > 0 ? -8 : 0 }} />)}
        </div>
        <div style={{ flex: 1 }} />
        <Sk w={118} h={34} r={9} />
      </div>

      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Sk w={26} h={26} r={6} />
        <Sk w={190} h={18} />
        <Sk w={26} h={26} r={6} />
        <Sk w={58} h={28} r={6} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '28px 32px 48px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Sk h={30} r={8} />
                {Array.from({ length: 9 }).map((_, row) => (
                  <Sk key={row} h={38} r={6} style={{ opacity: 1 - row * 0.06 }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 288, borderLeft: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk h={46} r={11} />
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk w={110} h={13} />
            {[0, 1, 2].map((i) => <Sk key={i} h={72} r={9} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
