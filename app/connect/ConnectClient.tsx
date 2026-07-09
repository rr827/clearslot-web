'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import Logo from '../components/Logo';
import { normalizeBusyBlocks } from '@/lib/calendar';

type Preference = 'morning' | 'afternoon' | 'evening' | 'none';

interface Questionnaire {
  range: { start: string; end: string };
  sleep: { from: string; to: string } | null;
  preference: Preference | null;
  includeAllDay?: boolean;
  blocked?: { from: string; to: string }[] | null;
}

type ConnectErrorCode =
  | 'oauth_denied'
  | 'invalid_state'
  | 'token_exchange'
  | 'server'
  | 'calendar_fetch_failed'
  | 'service_misconfigured'
  | 'payload_too_large'
  | 'room_failed'
  | 'join_failed'
  | 'auth_required';

interface ConnectClientProps {
  initialRoomCode: string | null;
  initialIsEditing: boolean;
  initialErrorCode: ConnectErrorCode | null;
  initialResume: boolean;
}

const CONNECT_ERRORS: Record<ConnectErrorCode, { title: string; body: string }> = {
  oauth_denied: {
    title: 'Google sign-in was cancelled',
    body: 'ClearSlot could not connect your calendar because access was denied before sign-in finished.',
  },
  invalid_state: {
    title: 'Your sign-in session expired',
    body: 'For security reasons, ClearSlot could not verify the sign-in return. Please try again.',
  },
  token_exchange: {
    title: 'Calendar connection failed',
    body: 'Google sign-in finished, but ClearSlot could not complete the secure token exchange.',
  },
  server: {
    title: 'Something went wrong on our side',
    body: 'ClearSlot hit a server error while trying to complete sign-in.',
  },
  calendar_fetch_failed: {
    title: 'Calendar availability could not be loaded',
    body: 'ClearSlot could not read your calendar timing data. Please try again in a moment.',
  },
  service_misconfigured: {
    title: 'Local setup is incomplete',
    body: 'This ClearSlot environment is missing a required server setting, so rooms cannot be created yet.',
  },
  payload_too_large: {
    title: 'This calendar file is too large to share',
    body: 'ClearSlot could not fit the imported availability into a room payload. Try a shorter date range or a smaller .ics export.',
  },
  room_failed: {
    title: 'Room setup failed',
    body: 'ClearSlot could not finish creating your room from the calendar data you provided.',
  },
  join_failed: {
    title: 'Could not join this room',
    body: 'ClearSlot could not add your availability to the room. The room may be full, expired, or temporarily unavailable.',
  },
  auth_required: {
    title: 'Reconnect to continue',
    body: 'ClearSlot needs your calendar connection again before it can create or join the room.',
  },
};

// Minimum scope for the initial verification flow.
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

const ConnectIcsSection = dynamic(() => import('./ConnectIcsSection'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ width: '100%', borderRadius: 14, padding: '14px 17px', border: '1.5px dashed #E5E7EB', color: '#9CA3AF', textAlign: 'center', fontSize: 14, fontWeight: 500 }}>
        Upload calendar file (.ics)
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: -4 }}>
        Apple Calendar · Yahoo · Proton · any other calendar
      </p>
    </div>
  ),
});

const RoomFlowLoader = dynamic(() => import('../components/RoomFlowLoader'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Preparing your room…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

function Check() {
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export default function ConnectClient({
  initialRoomCode,
  initialIsEditing,
  initialErrorCode,
  initialResume,
}: ConnectClientProps) {
  const router = useRouter();

  const today = format(new Date(), 'yyyy-MM-dd');
  const twoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const [storedRoomCode, setStoredRoomCode] = useState<string | null>(null);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(twoWeeks);
  const [sleepEnabled, setSleepEnabled] = useState(true);
  const [sleepFrom, setSleepFrom] = useState('23:00');
  const [sleepTo, setSleepTo] = useState('07:00');
  const [preference, setPreference] = useState<Preference | null>(null);
  const [includeAllDay, setIncludeAllDay] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [icsBusy, setIcsBusy] = useState(false);
  const [blockedEnabled, setBlockedEnabled] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState<{ from: string; to: string }[]>([{ from: '12:00', to: '13:00' }]);
  const [storedIsEditing, setStoredIsEditing] = useState(false);
  const roomCode = initialRoomCode ?? storedRoomCode;
  const isEditing = initialIsEditing || storedIsEditing;
  const errorCode = initialErrorCode;
  const errorMeta = errorCode ? CONNECT_ERRORS[errorCode] : null;

  if (initialResume) {
    return <RoomFlowLoader />;
  }

  useEffect(() => {
    try {
      setStoredRoomCode(null);
      setStoredIsEditing(false);
      const rawQuestionnaire = sessionStorage.getItem('aligned_questionnaire');
      if (rawQuestionnaire) {
        const parsed = JSON.parse(rawQuestionnaire) as Questionnaire;
        if (parsed.range?.start && parsed.range?.end) {
          const isDefaultTwoWeeks = parsed.range.start === today && parsed.range.end === twoWeeks;
          setUseCustomRange(!isDefaultTwoWeeks);
          setRangeStart(parsed.range.start);
          setRangeEnd(parsed.range.end);
        }
        setSleepEnabled(Boolean(parsed.sleep));
        if (parsed.sleep?.from) setSleepFrom(parsed.sleep.from);
        if (parsed.sleep?.to) setSleepTo(parsed.sleep.to);
        setPreference(parsed.preference ?? null);
        setIncludeAllDay(parsed.includeAllDay ?? true);
        if (parsed.blocked?.length) {
          setBlockedEnabled(true);
          setBlockedRanges(parsed.blocked);
        } else {
          setBlockedEnabled(false);
        }
      }

      const action = sessionStorage.getItem('aligned_room_action');
      if (!initialRoomCode) {
        if (action?.startsWith('join:')) {
          setStoredRoomCode(action.slice(5).toUpperCase());
        } else if (action?.startsWith('update:')) {
          setStoredRoomCode(action.slice(7).toUpperCase());
          setStoredIsEditing(true);
        }
      }
    } catch {
      // Ignore malformed recovery state and fall back to defaults.
    }
  }, [initialRoomCode, today, twoWeeks]);

  function storeQuestionnaire(q: Questionnaire) {
    sessionStorage.setItem('aligned_questionnaire', JSON.stringify(q));
    const nextAction = roomCode
      ? `${isEditing ? 'update' : 'join'}:${roomCode.toUpperCase()}`
      : 'create';
    sessionStorage.setItem('aligned_room_action', nextAction);
  }

  async function launchOAuth(q: Questionnaire) {
    storeQuestionnaire(q);
    sessionStorage.setItem('aligned_provider', 'google');
    const res = await fetch('/api/auth/state', { method: 'POST' });
    const { nonce } = await res.json();
    const state = JSON.stringify({ nonce, returnTo: '/connect?resume=1' });
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: SCOPES,
      prompt: 'select_account consent',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  const getQuestionnaire = () => ({
    range: { start: rangeStart, end: rangeEnd },
    sleep: sleepEnabled ? { from: sleepFrom, to: sleepTo } : null,
    preference,
    includeAllDay,
    blocked: blockedEnabled && blockedRanges.length > 0 ? blockedRanges : null,
  });

  const handleOAuth = () => {
    setLaunching(true);
    launchOAuth(getQuestionnaire());
  };

  const handleIcsParsed = (blocks: { start: string; end: string }[]) => {
    const questionnaire = getQuestionnaire();
    const normalizedBlocks = normalizeBusyBlocks(blocks, { range: questionnaire.range });
    storeQuestionnaire(questionnaire);
    sessionStorage.setItem('aligned_provider', 'ics');
    sessionStorage.setItem('aligned_ics_blocks', JSON.stringify(normalizedBlocks));
    router.push('/connect?resume=1');
  };

  const skipAll = () => {
    setLaunching(true);
    launchOAuth({ range: { start: today, end: twoWeeks }, sleep: null, preference: null, includeAllDay: true });
  };

  const handleManual = () => {
    setLaunching(true);
    storeQuestionnaire(getQuestionnaire());
    sessionStorage.setItem('aligned_provider', 'manual');
    router.push('/manual');
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #E5E7EB', fontSize: 14, color: '#111111',
    backgroundColor: '#fff', boxSizing: 'border-box' as const,
  };

  const sectionLabel = { fontSize: 11, fontWeight: 600 as const, color: '#22C55E', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 };

  const busy = launching || icsBusy;
  const retryHref = roomCode
    ? `/connect?room=${roomCode}${isEditing ? '&edit=1' : ''}`
    : '/connect';

  function clearRecoveryState() {
    sessionStorage.removeItem('aligned_questionnaire');
    sessionStorage.removeItem('aligned_room_action');
    sessionStorage.removeItem('aligned_provider');
    sessionStorage.removeItem('aligned_ics_blocks');
    setStoredRoomCode(null);
    setStoredIsEditing(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', zIndex: 10, borderBottom: '1px solid #F3F4F6' }}>
        <Logo iconSize={56} textSize={32} />
        <button onClick={skipAll} disabled={busy} style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
          {launching ? 'Redirecting...' : 'Skip all →'}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 24px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {errorMeta && (
          <div style={{ border: '1px solid #FECACA', backgroundColor: '#FEF2F2', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#991B1B' }}>{errorMeta.title}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7F1D1D' }}>{errorMeta.body}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.replace(retryHref)}
                style={{ backgroundColor: '#991B1B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  clearRecoveryState();
                  router.replace('/connect');
                }}
                style={{ backgroundColor: '#fff', color: '#7F1D1D', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => router.replace('/')}
                style={{ background: 'none', color: '#7F1D1D', border: 'none', padding: '10px 4px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Go home
              </button>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {isEditing && roomCode ? `Update room ${roomCode}` : roomCode ? `Joining room ${roomCode}` : 'Set your preferences'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            {isEditing && roomCode
              ? "Adjust your scheduling preferences and refresh the availability you've already shared with this room."
              : roomCode
                ? "We'll compare your calendar with the room to find the best overlap."
                : "Tell us a bit about your schedule before connecting your calendar."}
          </p>
        </div>

        {/* ── Date range ── */}
        <div>
          <p style={sectionLabel}>Date range</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => { setUseCustomRange(false); setRangeStart(today); setRangeEnd(twoWeeks); }}
              style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${!useCustomRange ? '#22C55E' : '#E5E7EB'}`, background: !useCustomRange ? 'rgba(34,197,94,0.06)' : '#fff', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111111', marginBottom: 1 }}>Next 2 weeks</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>{format(new Date(), 'MMM d')} – {format(addDays(new Date(), 14), 'MMM d')}</p>
              </div>
              {!useCustomRange && <Check />}
            </button>

            <button onClick={() => setUseCustomRange(true)}
              style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${useCustomRange ? '#22C55E' : '#E5E7EB'}`, background: useCustomRange ? 'rgba(34,197,94,0.06)' : '#fff', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111111', marginBottom: 1 }}>Custom range</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>Pick specific start and end dates</p>
              </div>
              {useCustomRange && <Check />}
            </button>

            {useCustomRange && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Start</label>
                  <input type="date" value={rangeStart} min={today} onChange={e => setRangeStart(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>End</label>
                  <input type="date" value={rangeEnd} min={rangeStart} onChange={e => setRangeEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sleep hours ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Sleep hours</p>
            <button onClick={() => setSleepEnabled(v => !v)}
              style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: sleepEnabled ? '#22C55E' : '#E5E7EB', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: sleepEnabled ? 21 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
          {sleepEnabled ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Bedtime</label>
                <input type="time" value={sleepFrom} onChange={e => setSleepFrom(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>Wake up</label>
                <input type="time" value={sleepTo} onChange={e => setSleepTo(e.target.value)} style={inputStyle} />
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sleep hours won't be blocked</p>
          )}
        </div>

        {/* ── All-day events ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ ...sectionLabel, marginBottom: 2 }}>All-day events</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Treat full-day calendar events as unavailable time</p>
            </div>
            <button
              type="button"
              aria-label="Toggle all-day events"
              onClick={() => setIncludeAllDay((value) => !value)}
              style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: includeAllDay ? '#22C55E' : '#E5E7EB', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 3, left: includeAllDay ? 21 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
            {includeAllDay ? 'Full-day events will block that entire day in your availability.' : 'Full-day events will be ignored when ClearSlot builds your availability.'}
          </p>
        </div>

        {/* ── Meeting preference ── */}
        <div>
          <p style={sectionLabel}>Meeting preference</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { value: 'morning',   label: 'Morning',       sub: '6 am – 12 pm' },
              { value: 'afternoon', label: 'Afternoon',     sub: '12 pm – 6 pm' },
              { value: 'evening',   label: 'Evening',       sub: '6 pm – 10 pm' },
              { value: 'none',      label: 'No preference', sub: 'Show all equally' },
            ] as { value: Preference; label: string; sub: string }[]).map(({ value, label, sub }) => (
              <button key={value} onClick={() => setPreference(prev => prev === value ? null : value)}
                style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${preference === value ? '#22C55E' : '#E5E7EB'}`, background: preference === value ? 'rgba(34,197,94,0.06)' : '#fff', cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 11, color: '#6B7280' }}>{sub}</p>
                {preference === value && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 14, height: 14, borderRadius: '50%', backgroundColor: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5 3-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Blocked time ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ ...sectionLabel, marginBottom: 2 }}>Blocked time</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Recurring daily ranges you never want scheduled</p>
            </div>
            <button type="button" aria-label="Toggle blocked time" onClick={() => setBlockedEnabled(v => !v)}
              style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: blockedEnabled ? '#22C55E' : '#E5E7EB', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: blockedEnabled ? 21 : 3, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
          {blockedEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedRanges.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>From</label>
                    <input type="time" value={r.from} aria-label="Block from"
                      onChange={e => setBlockedRanges(prev => prev.map((x, j) => j === i ? { ...x, from: e.target.value } : x))}
                      style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>To</label>
                    <input type="time" value={r.to} aria-label="Block to"
                      onChange={e => setBlockedRanges(prev => prev.map((x, j) => j === i ? { ...x, to: e.target.value } : x))}
                      style={inputStyle} />
                  </div>
                  {blockedRanges.length > 1 && (
                    <button type="button" aria-label="Remove blocked range"
                      onClick={() => setBlockedRanges(prev => prev.filter((_, j) => j !== i))}
                      style={{ marginTop: 18, width: 28, height: 28, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setBlockedRanges(prev => [...prev, { from: '12:00', to: '13:00' }])}
                style={{ alignSelf: 'flex-start', fontSize: 13, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 500 }}>
                + Add another range
              </button>
            </div>
          )}
        </div>

        {/* ── Connect ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          {/* Google */}
          <button onClick={handleOAuth} disabled={busy} type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#22C55E', color: '#fff', borderRadius: 14, padding: '17px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {launching ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </div>

          <ConnectIcsSection
            busy={busy}
            includeAllDay={includeAllDay}
            onBusyChange={setIcsBusy}
            onParsed={handleIcsParsed}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </div>

          <button
            type="button"
            onClick={handleManual}
            disabled={busy}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', color: '#6B7280', borderRadius: 14, padding: '14px 17px', fontSize: 14, fontWeight: 500, border: '1.5px dashed #E5E7EB', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}
          >
            Enter availability manually
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
            Read-only calendar timing access only. ClearSlot does not store event details on its servers. Temporary availability blocks may be stored for shared rooms. Any future calendar write permission would be requested separately.
          </p>
        </div>

      </div>
    </div>
  );
}
