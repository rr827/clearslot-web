'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isConnected } from '@/lib/auth';
import { fetchBusyBlocks, fetchBusyBlocksMicrosoft, BusyBlock, normalizeBusyBlocks } from '@/lib/calendar';
import { encodePayload, AlignedPayload } from '@/lib/payload';
import { captureClientEvent } from '@/lib/analyticsClient';
import { format, addDays, differenceInDays } from 'date-fns';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const CALENDAR_FETCH_TIMEOUT_MS = 15_000;
const ROOM_MUTATION_TIMEOUT_MS = 15_000;

function toFlowAction(action: string): 'create' | 'join' | 'update' {
  if (action.startsWith('join:')) return 'join';
  if (action.startsWith('update:')) return 'update';
  return 'create';
}

function trackFlowFailure(
  action: 'create' | 'join' | 'update',
  provider: string,
  reason: string
) {
  captureClientEvent('room_flow_failed', {
    action,
    provider,
    reason,
  });
}

// Shared room-flow loader.
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

export default function RoomFlowLoader() {
  const router = useRouter();
  const ran = useRef(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const [joinChallenge, setJoinChallenge] = useState<{ code: string; payload: string } | null>(null);
  const [joinCooldownSeconds, setJoinCooldownSeconds] = useState(0);
  const [joinChallengeMessage, setJoinChallengeMessage] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your room…');
  const [flowError, setFlowError] = useState<string | null>(null);

  useEffect(() => {
    if (joinCooldownSeconds <= 0) return;
    const id = window.setInterval(() => {
      setJoinCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [joinCooldownSeconds]);

  useEffect(() => {
    if (!joinChallenge || !TURNSTILE_SITE_KEY || !turnstileReady || !turnstileContainerRef.current || !window.turnstile) {
      return;
    }

    if (turnstileWidgetRef.current) return;

    turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => {
        setTurnstileToken(token);
        setJoinChallengeMessage(null);
      },
      'expired-callback': () => {
        setTurnstileToken(null);
      },
      'error-callback': () => {
        setTurnstileToken(null);
        setJoinChallengeMessage('Verification failed to load. Please try again.');
      },
    });
  }, [joinChallenge, turnstileReady]);

  useEffect(() => {
    if (!joinChallenge && turnstileWidgetRef.current && window.turnstile) {
      window.turnstile.remove(turnstileWidgetRef.current);
      turnstileWidgetRef.current = null;
      setTurnstileToken(null);
    }
  }, [joinChallenge]);

  function resetTurnstile() {
    setTurnstileToken(null);
    if (turnstileWidgetRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetRef.current);
    }
  }

  async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('REQUEST_TIMEOUT');
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function continueFlow(turnstileTokenOverride?: string) {
    try {
      setFlowError(null);
      const action = sessionStorage.getItem('aligned_room_action') ?? 'create';
      const provider = sessionStorage.getItem('aligned_provider') ?? 'google';
      const flowAction = toFlowAction(action);
      const requiresCalendarAuth = provider !== 'ics' && provider !== 'manual';
      const isUpdateAction = action.startsWith('update:');
      if (requiresCalendarAuth && !isConnected()) {
        trackFlowFailure(flowAction, provider, 'auth_required');
        const reconnectCode = action.startsWith('join:') || action.startsWith('update:')
          ? action.slice(action.indexOf(':') + 1)
          : null;
        const reconnectPath = reconnectCode
          ? `/connect?room=${reconnectCode}&error=auth_required${isUpdateAction ? '&edit=1' : ''}`
          : '/connect?error=auth_required';
        router.replace(reconnectPath);
        return;
      }

      const qRaw = sessionStorage.getItem('aligned_questionnaire');
      let q: {
        range?: { start?: string; end?: string };
        sleep?: { from: string; to: string } | null;
        preference?: AlignedPayload['preference'];
        includeAllDay?: boolean;
        blocked?: { from: string; to: string }[] | null;
      } | null = null;
      try {
        q = qRaw ? JSON.parse(qRaw) : null;
      } catch {
        q = null;
      }

      const range = q?.range?.start && q?.range?.end
        ? { start: q.range.start, end: q.range.end }
        : {
            start: format(new Date(), 'yyyy-MM-dd'),
            end: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
          };

      const computedDaysAhead = differenceInDays(new Date(`${range.end}T23:59`), new Date()) + 1;
      const daysAhead = Number.isFinite(computedDaysAhead) ? Math.max(14, computedDaysAhead) : 14;

      const reconnectCode = action.startsWith('join:') || action.startsWith('update:')
        ? action.slice(action.indexOf(':') + 1)
        : null;
      const connectPath = (errorCode: string) =>
        reconnectCode
          ? `/connect?room=${reconnectCode}&error=${errorCode}${isUpdateAction ? '&edit=1' : ''}`
          : `/connect?error=${errorCode}`;
      const mapRoomError = (message: unknown) => {
        const text = typeof message === 'string' ? message : '';
        if (text === 'Service misconfigured' || text === 'ROOM_SESSION_SECRET is not configured') {
          return 'service_misconfigured';
        }
        if (text === 'Payload too large') {
          return 'payload_too_large';
        }
        if (text === 'Room not found') {
          return 'join_failed';
        }
        return 'room_failed';
      };
      const clearFlowState = () => {
        sessionStorage.removeItem('aligned_questionnaire');
        sessionStorage.removeItem('aligned_room_action');
        sessionStorage.removeItem('aligned_provider');
        sessionStorage.removeItem('aligned_ics_blocks');
        sessionStorage.removeItem('aligned_manual_blocks');
      };

      let blocks: BusyBlock[] = [];
      if (provider === 'ics') {
        setLoadingMessage('Preparing your imported calendar…');
        const raw = sessionStorage.getItem('aligned_ics_blocks');
        try {
          blocks = raw ? JSON.parse(raw) : [];
        } catch {
          blocks = [];
        }
      } else if (provider === 'manual') {
        setLoadingMessage('Preparing your manual availability…');
        const raw = sessionStorage.getItem('aligned_manual_blocks');
        try {
          blocks = raw ? JSON.parse(raw) : [];
        } catch {
          blocks = [];
        }
      } else {
        setLoadingMessage('Loading your calendar availability…');
        try {
          if (provider === 'microsoft') {
            blocks = await fetchBusyBlocksMicrosoft(daysAhead, q?.includeAllDay ?? true, CALENDAR_FETCH_TIMEOUT_MS);
          } else {
            blocks = await fetchBusyBlocks(daysAhead, q?.includeAllDay ?? true, CALENDAR_FETCH_TIMEOUT_MS);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '';
          trackFlowFailure(flowAction, provider, errorMessage.includes('401') ? 'calendar_auth_failed' : 'calendar_fetch_failed');
          router.replace(connectPath(errorMessage.includes('401') ? 'auth_required' : 'calendar_fetch_failed'));
          return;
        }
      }

      const payload: AlignedPayload = {
        range,
        sleep: q?.sleep ?? null,
        preference: q?.preference ?? null,
        includeAllDay: q?.includeAllDay ?? true,
        blocks: normalizeBusyBlocks(blocks, { range }),
        blocked: q?.blocked ?? null,
        source: provider as AlignedPayload['source'],
      };

      const encoded = encodePayload(payload);

      if (action.startsWith('join:')) {
        const code = action.slice(5);
        setLoadingMessage('Joining the room…');
        let res: Response;
        try {
          res = await fetchWithTimeout('/api/room/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, payload: encoded, turnstileToken: turnstileTokenOverride }),
          }, ROOM_MUTATION_TIMEOUT_MS);
        } catch (error) {
          trackFlowFailure(flowAction, provider, error instanceof Error ? error.message : 'join_request_failed');
          router.replace(connectPath(mapRoomError(error instanceof Error ? error.message : '')));
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          captureClientEvent('invitee_joined', {
            provider,
            participant_count: data.room?.participants?.length ?? null,
          });
          captureClientEvent('room_flow_completed', {
            action: flowAction,
            provider,
            participant_count: data.room?.participants?.length ?? null,
          });
          clearFlowState();
          localStorage.setItem(`room_${code}`, String(data.room.participants.length - 1));
          router.replace(`/room/${code}`);
          return;
        }

        if (data.challengeRequired) {
          captureClientEvent('room_join_verification_required', {
            provider,
          });
          setJoinChallenge({ code, payload: encoded });
          setJoinCooldownSeconds(0);
          setJoinChallengeMessage('Please complete the verification check to join this room.');
          resetTurnstile();
          return;
        }

        if (data.cooldownActive) {
          captureClientEvent('room_join_cooldown_shown', {
            provider,
            retry_after_seconds: Number(data.retryAfter) || 30,
          });
          setJoinCooldownSeconds(Number(data.retryAfter) || 30);
          setJoinChallenge(null);
          setJoinChallengeMessage(null);
          return;
        }

        trackFlowFailure(flowAction, provider, typeof data.error === 'string' ? data.error : 'join_failed');
        router.replace(connectPath(mapRoomError(data.error)));
        return;
      }

      if (action.startsWith('update:')) {
        const code = action.slice(7);
        setLoadingMessage('Refreshing your availability…');
        let res: Response;
        try {
          res = await fetchWithTimeout('/api/room/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, payload: encoded }),
          }, ROOM_MUTATION_TIMEOUT_MS);
        } catch (error) {
          trackFlowFailure(flowAction, provider, error instanceof Error ? error.message : 'update_request_failed');
          router.replace(connectPath(mapRoomError(error instanceof Error ? error.message : '')));
          return;
        }
        if (res.ok) {
          captureClientEvent('room_flow_completed', {
            action: flowAction,
            provider,
          });
          clearFlowState();
          router.replace(`/room/${code}`);
        } else {
          const data = await res.json().catch(() => ({}));
          trackFlowFailure(flowAction, provider, typeof data.error === 'string' ? data.error : 'update_failed');
          router.replace(connectPath(data.error === 'Not authenticated for this room' ? 'auth_required' : mapRoomError(data.error)));
        }
        return;
      }

      setLoadingMessage('Creating your room…');
      let res: Response;
      try {
        res = await fetchWithTimeout('/api/room/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: encoded }),
        }, ROOM_MUTATION_TIMEOUT_MS);
      } catch (error) {
        trackFlowFailure(flowAction, provider, error instanceof Error ? error.message : 'create_request_failed');
        router.replace(connectPath(mapRoomError(error instanceof Error ? error.message : '')));
        return;
      }
      if (res.ok) {
        const { code: createdCode } = await res.json();
        captureClientEvent('room_created', {
          provider,
          participant_count: 1,
        });
        if (localStorage.getItem('clearslot_invite_opened') === '1') {
          captureClientEvent('room_created_by_former_invitee', {
            provider,
          });
        }
        captureClientEvent('room_flow_completed', {
          action: flowAction,
          provider,
          participant_count: 1,
        });
        clearFlowState();
        localStorage.setItem(`room_${createdCode}`, '0');
        router.replace(`/room/${createdCode}`);
      } else {
        const data = await res.json().catch(() => ({}));
        trackFlowFailure(flowAction, provider, typeof data.error === 'string' ? data.error : 'create_failed');
        router.replace(connectPath(mapRoomError(data.error)));
      }
    } catch (error) {
      console.error('room/new flow failed:', error);
      const action = sessionStorage.getItem('aligned_room_action') ?? 'create';
      const provider = sessionStorage.getItem('aligned_provider') ?? 'google';
      trackFlowFailure(toFlowAction(action), provider, error instanceof Error ? error.message : 'unexpected_flow_error');
      setFlowError('ClearSlot could not finish preparing this room. Please try again or start over.');
    }
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void continueFlow();
  }, [router]);

  const showJoinChallenge = Boolean(joinChallenge);
  const showJoinCooldown = joinCooldownSeconds > 0 && !showJoinChallenge;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {showJoinChallenge && TURNSTILE_SITE_KEY ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
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

      {!showJoinChallenge && !showJoinCooldown ? (
        <div style={{ padding: '14px 28px 0', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
            {loadingMessage}
          </p>
        </div>
      ) : null}

      {flowError ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 420, border: '1px solid #FECACA', borderRadius: 20, backgroundColor: '#FFFFFF', padding: '28px 24px', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B42318' }}>
                Room setup failed
              </p>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 700, color: '#111827' }}>
                Something went wrong
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#667085' }}>
              {flowError}
            </p>
            <button
              type="button"
              onClick={() => {
                ran.current = false;
                void continueFlow();
              }}
              style={{ width: '100%', backgroundColor: '#1EAF53', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.replace('/connect')}
              style={{ width: '100%', backgroundColor: '#F3F4F6', color: '#111827', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Start over
            </button>
          </div>
        </div>
      ) : showJoinChallenge || showJoinCooldown ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 420, border: '1px solid #E5E7EB', borderRadius: 20, backgroundColor: '#FFFFFF', padding: '28px 24px', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#16A34A' }}>
                Room protection
              </p>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 700, color: '#111827' }}>
                {showJoinChallenge ? 'Verify to continue' : 'Please wait a moment'}
              </h1>
            </div>

            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#667085' }}>
              {showJoinChallenge
                ? 'ClearSlot detected repeated failed room joins from this connection. Complete the verification check to continue joining this room.'
                : `Too many failed join attempts were detected from this connection. Try again in ${joinCooldownSeconds} second${joinCooldownSeconds === 1 ? '' : 's'}.`}
            </p>

            {showJoinChallenge ? (
              <>
                <div
                  ref={turnstileContainerRef}
                  style={{ minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
                {joinChallengeMessage ? (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#B42318' }}>
                    {joinChallengeMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (!turnstileToken) {
                      setJoinChallengeMessage('Please complete the verification check before continuing.');
                      return;
                    }
                    void continueFlow(turnstileToken);
                  }}
                  style={{ width: '100%', backgroundColor: '#1EAF53', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: turnstileToken ? 1 : 0.7 }}
                >
                  Verify and join room
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void continueFlow()}
                disabled={joinCooldownSeconds > 0}
                style={{ width: '100%', backgroundColor: '#F3F4F6', color: '#111827', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontWeight: 700, cursor: joinCooldownSeconds > 0 ? 'not-allowed' : 'pointer', opacity: joinCooldownSeconds > 0 ? 0.6 : 1 }}
              >
                {joinCooldownSeconds > 0 ? `Try again in ${joinCooldownSeconds}s` : 'Try again'}
              </button>
            )}
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
