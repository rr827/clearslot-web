'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [showOpenApp, setShowOpenApp] = useState(false);
  const [appOpenAttempted, setAppOpenAttempted] = useState(false);
  const [showInstallFallback, setShowInstallFallback] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const appOpenFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function openInApp() {
    setAppOpenAttempted(true);
    setShowInstallFallback(false);
    if (appOpenFallbackTimer.current) {
      clearTimeout(appOpenFallbackTimer.current);
    }
    appOpenFallbackTimer.current = setTimeout(() => {
      setShowInstallFallback(true);
    }, 1400);
    window.location.href = `clearslot://room?code=${code}`;
  }

  function openAppStore() {
    const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL;
    if (appStoreUrl) {
      window.location.href = appStoreUrl;
    }
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      setCodeCopied(false);
    }
  }

  useEffect(() => {
    setShowOpenApp(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
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
      if (appOpenFallbackTimer.current) {
        clearTimeout(appOpenFallbackTimer.current);
      }
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

  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL;
  const canInstallApp = Boolean(appStoreUrl);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FC',
        display: 'flex',
        alignItems: showOpenApp ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: showOpenApp ? '18px 16px 24px' : 24,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: showOpenApp ? 430 : 520,
          margin: showOpenApp ? '0 auto' : undefined,
          backgroundColor: '#FFFFFF',
          border: showOpenApp ? 'none' : '1px solid #E8EBF0',
          borderRadius: showOpenApp ? 0 : 28,
          padding: showOpenApp ? '18px 8px 0' : '34px 30px',
          boxShadow: showOpenApp ? 'none' : '0 16px 34px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ marginBottom: showOpenApp ? 34 : 26, display: 'flex', justifyContent: showOpenApp ? 'center' : 'flex-start' }}>
          <Logo iconSize={showOpenApp ? 34 : 60} textSize={showOpenApp ? 28 : 42} />
        </div>

        <div style={{ textAlign: showOpenApp ? 'center' : 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#22C55E', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Room invite
          </p>
          <h1 style={{ fontSize: showOpenApp ? 38 : 34, lineHeight: 1.05, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.05em' }}>
            Join this ClearSlot room
          </h1>
          <p style={{ fontSize: showOpenApp ? 17 : 16, color: '#667085', lineHeight: 1.55, margin: '0 auto 24px', maxWidth: 440 }}>
            Add your availability first, then meet everyone in the shared week view.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E8EBF0',
            borderRadius: 24,
            padding: showOpenApp ? '22px 20px' : '18px 18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#98A2B3', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Room code
          </p>
          <div
            style={{
              alignSelf: showOpenApp ? 'center' : 'flex-start',
              borderRadius: 18,
              border: '1px solid rgba(34,197,94,0.26)',
              backgroundColor: 'rgba(34,197,94,0.10)',
              color: '#15803D',
              padding: '10px 16px',
              fontSize: showOpenApp ? 30 : 26,
              fontWeight: 800,
              letterSpacing: '0.12em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {code}
          </div>
          <p style={{ margin: 0, fontSize: showOpenApp ? 15 : 14, fontWeight: 600, color: '#111827', lineHeight: 1.5, textAlign: showOpenApp ? 'center' : 'left' }}>
            {room.participantCount === 1
              ? '1 person is already coordinating here.'
              : `${room.participantCount} people are already coordinating here.`}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#667085', lineHeight: 1.6, textAlign: showOpenApp ? 'center' : 'left' }}>
            Choose preferences, connect Google or enter availability manually, then join the same room.
          </p>
        </div>

        {room.joinable ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: showOpenApp ? 14 : 10 }}>
            {showOpenApp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={openInApp}
                  style={{ width: '100%', fontSize: 17, fontWeight: 800, color: '#fff', backgroundColor: '#22C55E', border: 'none', borderRadius: 18, padding: '17px 16px', cursor: 'pointer' }}
                >
                  Open in ClearSlot app
                </button>
                {appOpenAttempted && (
                  <p style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: '#667085' }}>
                    {showInstallFallback
                      ? "Still here? The app may not be installed, or this browser didn't allow the handoff."
                      : 'Opening the app...'}
                  </p>
                )}
              </div>
            )}
            {showOpenApp && canInstallApp && showInstallFallback && (
              <button
                type="button"
                onClick={openAppStore}
                style={{ width: '100%', fontSize: 16, fontWeight: 750, color: '#111827', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 18, padding: '16px 16px', cursor: 'pointer' }}
              >
                Get the app
              </button>
            )}
            {showOpenApp && showInstallFallback && (
              <div style={{ border: '1px solid #E8EBF0', borderRadius: 18, padding: '14px 16px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#667085', textAlign: 'center' }}>
                  {canInstallApp
                    ? 'If the app is installed but did not open, copy the room code and enter it in ClearSlot.'
                    : 'If the app is installed but did not open, copy the room code and enter it in ClearSlot. Otherwise, continue on web.'}
                </p>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  style={{ width: '100%', fontSize: 15, fontWeight: 750, color: '#15803D', backgroundColor: '#FFFFFF', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}
                >
                  {codeCopied ? 'Copied' : `Copy room code ${code}`}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={beginJoinFlow}
              style={{ width: '100%', fontSize: showOpenApp ? 16 : 16, fontWeight: 750, color: showOpenApp ? '#15803D' : '#fff', backgroundColor: showOpenApp ? '#FFFFFF' : '#22C55E', border: showOpenApp ? '1px solid rgba(34,197,94,0.30)' : 'none', borderRadius: showOpenApp ? 18 : 14, padding: showOpenApp ? '16px 16px' : '14px 16px', cursor: 'pointer' }}
            >
              Continue on web
            </button>
            <button
              type="button"
              onClick={() => router.push(`/room/${code}`)}
              style={{ width: '100%', fontSize: 15, fontWeight: 650, color: '#667085', backgroundColor: 'transparent', border: 'none', borderRadius: 14, padding: '10px 16px', cursor: 'pointer' }}
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

        {showOpenApp && (
          <p style={{ margin: '26px auto 0', maxWidth: 310, textAlign: 'center', fontSize: 13, lineHeight: 1.55, color: '#98A2B3' }}>
            If the app is installed, this button opens the room there. If not, continue on web for the same room.
          </p>
        )}
      </div>
    </div>
  );
}
