'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import Logo from '../components/Logo';

type Preference = 'morning' | 'afternoon' | 'evening' | 'none';

interface Questionnaire {
  range: { start: string; end: string };
  sleep: { from: string; to: string } | null;
  preference: Preference | null;
  blocked?: { from: string; to: string }[] | null;
}

// Read-only scope only — calendar.events prompted separately when adding a meeting
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

function Check() {
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 'auto' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function ConnectContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room');
  const router = useRouter();

  const today = format(new Date(), 'yyyy-MM-dd');
  const twoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(twoWeeks);
  const [sleepEnabled, setSleepEnabled] = useState(true);
  const [sleepFrom, setSleepFrom] = useState('23:00');
  const [sleepTo, setSleepTo] = useState('07:00');
  const [preference, setPreference] = useState<Preference | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchingOutlook, setLaunchingOutlook] = useState(false);
  const [icsStatus, setIcsStatus] = useState<'idle' | 'parsing' | 'ready' | 'error'>('idle');
  const [icsBlockCount, setIcsBlockCount] = useState(0);
  const [blockedEnabled, setBlockedEnabled] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState<{ from: string; to: string }[]>([{ from: '12:00', to: '13:00' }]);
  const [showExportHint, setShowExportHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function storeQuestionnaire(q: Questionnaire) {
    sessionStorage.setItem('aligned_questionnaire', JSON.stringify(q));
    sessionStorage.setItem('aligned_room_action', roomCode ? `join:${roomCode.toUpperCase()}` : 'create');
  }

  async function launchOAuth(q: Questionnaire) {
    storeQuestionnaire(q);
    sessionStorage.setItem('aligned_provider', 'google');
    const res = await fetch('/api/auth/state', { method: 'POST' });
    const { nonce } = await res.json();
    const state = JSON.stringify({ nonce, returnTo: '/room/new' });
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'select_account consent',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async function launchMicrosoftOAuth(q: Questionnaire) {
    storeQuestionnaire(q);
    sessionStorage.setItem('aligned_provider', 'microsoft');
    const res = await fetch('/api/auth/state', { method: 'POST' });
    const { nonce } = await res.json();
    const state = JSON.stringify({ nonce, returnTo: '/room/new' });
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/microsoft/callback`,
      response_type: 'code',
      scope: 'openid email profile Calendars.Read offline_access',
      prompt: 'select_account',
      state,
    });
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  const getQuestionnaire = () => ({
    range: { start: rangeStart, end: rangeEnd },
    sleep: sleepEnabled ? { from: sleepFrom, to: sleepTo } : null,
    preference,
    blocked: blockedEnabled && blockedRanges.length > 0 ? blockedRanges : null,
  });

  const handleOAuth = () => {
    setLaunching(true);
    launchOAuth(getQuestionnaire());
  };

  const handleOutlookOAuth = () => {
    setLaunchingOutlook(true);
    launchMicrosoftOAuth(getQuestionnaire());
  };

  const handleIcsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIcsStatus('parsing');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const blocks: { start: string; end: string }[] = [];
        const events = text.split('BEGIN:VEVENT');
        for (let i = 1; i < events.length; i++) {
          const ev = events[i];
          const dtstart = ev.match(/DTSTART(?:;[^:]+)?:(\d{8}T\d{6}Z?)/);
          const dtend = ev.match(/DTEND(?:;[^:]+)?:(\d{8}T\d{6}Z?)/);
          if (dtstart && dtend) {
            const parseIcsDate = (s: string) => {
              const y = s.slice(0, 4), mo = s.slice(4, 6), d = s.slice(6, 8);
              const h = s.slice(9, 11), mi = s.slice(11, 13), sec = s.slice(13, 15);
              return new Date(`${y}-${mo}-${d}T${h}:${mi}:${sec}${s.endsWith('Z') ? 'Z' : ''}`).toISOString();
            };
            blocks.push({ start: parseIcsDate(dtstart[1]), end: parseIcsDate(dtend[1]) });
          }
        }
        setIcsBlockCount(blocks.length);
        setIcsStatus('ready');
        storeQuestionnaire(getQuestionnaire());
        sessionStorage.setItem('aligned_provider', 'ics');
        sessionStorage.setItem('aligned_ics_blocks', JSON.stringify(blocks));
        router.push('/room/new');
      } catch {
        setIcsStatus('error');
      }
    };
    reader.onerror = () => setIcsStatus('error');
    reader.readAsText(file);
  };

  const skipAll = () => {
    launchOAuth({ range: { start: today, end: twoWeeks }, sleep: null, preference: null });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #E5E7EB', fontSize: 14, color: '#111111',
    backgroundColor: '#fff', boxSizing: 'border-box' as const,
  };

  const sectionLabel = { fontSize: 11, fontWeight: 600 as const, color: '#22C55E', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 };

  const busy = launching || launchingOutlook || icsStatus === 'parsing';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', zIndex: 10, borderBottom: '1px solid #F3F4F6' }}>
        <Logo iconSize={28} textSize={16} />
        <button onClick={skipAll} style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip all →
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '8px 24px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Title */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {roomCode ? `Joining room ${roomCode}` : 'Set your preferences'}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
            {roomCode ? "We'll compare your calendar with the room to find the best overlap." : "Tell us a bit about your schedule before connecting your calendar."}
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

          {/* Outlook */}
          <button onClick={handleOutlookOAuth} disabled={busy} type="button"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', color: '#111111', borderRadius: 14, padding: '17px', fontSize: 15, fontWeight: 600, border: '1.5px solid #E5E7EB', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="2" fill="#0078D4"/>
              <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {launchingOutlook ? 'Redirecting...' : 'Continue with Outlook'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </div>

          {/* .ics upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={handleIcsFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', color: '#6B7280', borderRadius: 14, padding: '14px 17px', fontSize: 14, fontWeight: 500, border: '1.5px dashed #E5E7EB', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}
          >
            {icsStatus === 'parsing' ? 'Reading file…' : icsStatus === 'ready' ? `✓ ${icsBlockCount} events loaded` : icsStatus === 'error' ? 'Error reading file — try again' : 'Upload calendar file (.ics)'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: -4 }}>
            Apple Calendar · Yahoo · Proton · any other calendar
          </p>

          {/* How to export hint */}
          <button type="button" onClick={() => setShowExportHint(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '0 0 4px' }}>
            How to export a .ics file {showExportHint ? '▲' : '▼'}
          </button>
          {showExportHint && (
            <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#6B7280', lineHeight: 1.8, border: '1px solid #E5E7EB' }}>
              <strong style={{ color: '#374151' }}>Google Calendar</strong> → Settings → Import &amp; Export → Export<br />
              <strong style={{ color: '#374151' }}>Apple Calendar</strong> → File → Export → Export…<br />
              <strong style={{ color: '#374151' }}>Outlook</strong> → Settings → General → Privacy &amp; data → Export mailbox
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>Read-only access · No event details stored · Free</p>
        </div>

      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ConnectContent />
    </Suspense>
  );
}
