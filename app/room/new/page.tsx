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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8EBF0',
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 12px 30px rgba(15,23,42,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div className="ghost-block" style={{ width: 96, height: 12, borderRadius: 999 }} />
              <div className="ghost-block" style={{ width: 220, height: 32, borderRadius: 12 }} />
            </div>
            <div className="ghost-block" style={{ width: 112, height: 40, borderRadius: 12 }} />
          </div>

          <div className="ghost-block" style={{ width: '100%', height: 18, borderRadius: 10 }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px repeat(5, 1fr)',
              gap: 8,
              alignItems: 'stretch',
            }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="ghost-block"
                style={{
                  height: i < 6 ? 28 : 42,
                  borderRadius: 10,
                  opacity: i < 6 ? 0.7 : 1,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px' }}>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Setting up your room…</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="ghost-dot" />
            <div className="ghost-dot" style={{ animationDelay: '0.15s' }} />
            <div className="ghost-dot" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ghostPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }

        .ghost-block {
          background: linear-gradient(135deg, #EEF2F7 0%, #F7F9FC 100%);
          animation: ghostPulse 1.4s ease-in-out infinite;
        }

        .ghost-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background-color: #22C55E;
          animation: ghostPulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
