'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Logo from '@/app/components/Logo';
import { captureClientEvent } from '@/lib/analyticsClient';

type InviteRoomState =
  | { code: string; expiresAt: string; participantCount: number; joinable: boolean }
  | null;

export default function InviteRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params?.code ?? '').toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<InviteRoomState>(null);

  function beginJoinFlow() {
    try {
      sessionStorage.removeItem('aligned_questionnaire');
      sessionStorage.removeItem('aligned_provider');
      sessionStorage.removeItem('aligned_ics_blocks');
      sessionStorage.removeItem('aligned_manual_blocks');
      sessionStorage.setItem('aligned_room_action', `join:${code}`);
    } catch {
      // If storage is unavailable, continue with the route transition anyway.
    }
    router.push(`/connect?room=${code}`);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      try {
        const res = await fetch(`/api/room/${code}?invite=1`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          setError('This room link is no longer active.');
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setRoom(data);
          captureClientEvent('invite_opened', {
            participant_count: data.participantCount ?? null,
            joinable: Boolean(data.joinable),
          });
          try {
            localStorage.setItem('clearslot_invite_opened', '1');
          } catch {}
        }
      } catch {
        if (!cancelled) {
          setError('ClearSlot could not open this invite right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (code) {
      void loadInvite();
    } else {
      setError('This room link is invalid.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', border: '1px solid #E8EBF0', borderRadius: 24, padding: '32px 28px', boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ marginBottom: 24 }}>
            <Logo iconSize={56} textSize={40} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 132, height: 12, borderRadius: 999, backgroundColor: '#EEF2F6' }} />
            <div style={{ width: '78%', height: 34, borderRadius: 12, backgroundColor: '#EEF2F6' }} />
            <div style={{ width: '100%', height: 16, borderRadius: 999, backgroundColor: '#F4F6F9' }} />
            <div style={{ width: '88%', height: 16, borderRadius: 999, backgroundColor: '#F4F6F9' }} />
            <div style={{ width: '100%', height: 48, borderRadius: 14, backgroundColor: '#E5F6EA', marginTop: 10 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', border: '1px solid #E8EBF0', borderRadius: 24, padding: '32px 28px', boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(15, 23, 42, 0.04)', textAlign: 'center' }}>
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
            <Logo iconSize={56} textSize={40} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#2F7B49', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>Invite unavailable</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, color: '#111827', margin: '0 0 12px' }}>
            This room link can&apos;t be used right now
          </h1>
          <p style={{ fontSize: 15, color: '#667085', lineHeight: 1.7, margin: '0 0 22px' }}>
            {error}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => router.replace('/connect')}
              style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#fff', backgroundColor: '#22C55E', border: 'none', borderRadius: 14, padding: '13px 16px', cursor: 'pointer' }}
            >
              Start a new room
            </button>
            <button
              type="button"
              onClick={() => router.replace('/')}
              style={{ width: '100%', fontSize: 15, fontWeight: 600, color: '#2F7B49', backgroundColor: 'rgba(61,154,92,0.10)', border: '1px solid rgba(61,154,92,0.22)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF', border: '1px solid #E8EBF0', borderRadius: 28, padding: '34px 30px', boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ marginBottom: 26 }}>
          <Logo iconSize={60} textSize={42} />
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#2F7B49', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Room invite
        </p>
        <h1 style={{ fontSize: 34, lineHeight: 1.08, color: '#111827', margin: '0 0 14px' }}>
          You&apos;re about to join room {code}
        </h1>
        <p style={{ fontSize: 16, color: '#667085', lineHeight: 1.75, margin: '0 0 22px', maxWidth: 440 }}>
          ClearSlot will walk you through your scheduling preferences first, then connect your availability and add you into the shared week view with everyone already in this room.
        </p>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8EBF0', borderRadius: 18, padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>
            {room.participantCount === 1
              ? '1 person is already in this room.'
              : `${room.participantCount} people are already in this room.`}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#667085', lineHeight: 1.65 }}>
            You&apos;ll choose your date range, sleep hours, all-day-event preference, and then connect Google, upload an `.ics` file, or enter your availability manually.
          </p>
        </div>

        {room.joinable ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={beginJoinFlow}
              style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#fff', backgroundColor: '#22C55E', border: 'none', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}
            >
              Continue to join room
            </button>
            <button
              type="button"
              onClick={() => router.push(`/room/${code}`)}
              style={{ width: '100%', fontSize: 15, fontWeight: 600, color: '#2F7B49', backgroundColor: 'rgba(61,154,92,0.10)', border: '1px solid rgba(61,154,92,0.22)', borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}
            >
              I already joined this room
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '16px 18px' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#991B1B' }}>
              This room is full.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#7F1D1D', lineHeight: 1.6 }}>
              Everyone can still use their existing room link, but no additional participants can be added right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
