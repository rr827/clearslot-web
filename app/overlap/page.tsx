'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, addDays, isSameDay, differenceInMinutes, startOfWeek, parseISO } from 'date-fns';
import { loadToken, clearToken } from '@/lib/auth';
import { useIsMobile } from '@/lib/useIsMobile';
import { fetchBusyBlocks, createCalendarEvent, BusyBlock } from '@/lib/calendar';
import { decodeAvailability, buildShareLink } from '@/lib/payload';
type ViewMode = 'day' | 'workWeek' | 'week';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getFreeGaps(date: Date, myBlocks: BusyBlock[], theirBlocks: BusyBlock[]) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayStart = new Date(date); dayStart.setHours(6, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(22, 0, 0, 0);
  const now = new Date();

  const allBusy = [
    ...myBlocks.filter(b => format(new Date(b.start), 'yyyy-MM-dd') === dateStr),
    ...theirBlocks.filter(b => format(new Date(b.start), 'yyyy-MM-dd') === dateStr),
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const block of allBusy) {
    const s = new Date(block.start), e = new Date(block.end);
    if (!merged.length || s >= merged[merged.length - 1].end) {
      merged.push({ start: s, end: e });
    } else {
      merged[merged.length - 1].end = new Date(Math.max(merged[merged.length - 1].end.getTime(), e.getTime()));
    }
  }

  const gaps: { start: Date; end: Date }[] = [];
  let cursor = new Date(Math.max(dayStart.getTime(), now.getTime()));
  for (const busy of merged) {
    if (busy.start > cursor) gaps.push({ start: new Date(cursor), end: new Date(busy.start) });
    cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
  }
  if (cursor < dayEnd) gaps.push({ start: new Date(cursor), end: new Date(dayEnd) });
  return gaps.filter(g => differenceInMinutes(g.end, g.start) >= 30);
}

function getWeekDates(base: Date): Date[] {
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const TIME_BLOCKS = [
  { label: 'Morning', shortLabel: 'AM', startH: 6, endH: 12 },
  { label: 'Midday',  shortLabel: 'Noon', startH: 12, endH: 15 },
  { label: 'Afternoon', shortLabel: 'PM', startH: 15, endH: 18 },
  { label: 'Evening', shortLabel: 'Eve', startH: 18, endH: 22 },
];

type BlockState = 'bothFree' | 'meFree' | 'themFree' | 'bothBusy';

function getBlockState(date: Date, startH: number, endH: number, myBlocks: BusyBlock[], theirBlocks: BusyBlock[]): BlockState {
  const dateStr = format(date, 'yyyy-MM-dd');
  const midMin = ((startH + endH) / 2) * 60;
  const toMin = (iso: string) => { const d = parseISO(iso); return d.getHours() * 60 + d.getMinutes(); };
  const mine = myBlocks.filter(b => format(parseISO(b.start), 'yyyy-MM-dd') === dateStr);
  const theirs = theirBlocks.filter(b => format(parseISO(b.start), 'yyyy-MM-dd') === dateStr);
  const myBusy = mine.some(b => toMin(b.start) <= midMin && toMin(b.end) > midMin);
  const theirBusy = theirs.some(b => toMin(b.start) <= midMin && toMin(b.end) > midMin);
  if (!myBusy && !theirBusy) return 'bothFree';
  if (!myBusy && theirBusy) return 'meFree';
  if (myBusy && !theirBusy) return 'themFree';
  return 'bothBusy';
}

const BLOCK_COLOR: Record<BlockState, string> = {
  bothFree:  '#22C55E',
  meFree:    '#22C55E',
  themFree:  '#1c3461',
  bothBusy:  '#e2e2dc',
};

function OverlapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [myBlocks, setMyBlocks] = useState<BusyBlock[]>([]);
  const [theirBlocks, setTheirBlocks] = useState<BusyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [activeFilters, setActiveFilters] = useState<string[]>(ALL_DAYS);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [copied, setCopied] = useState(false);

  const dayStripDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const weekDates = getWeekDates(selectedDate);
  const visibleDates = viewMode === 'day'
    ? [selectedDate]
    : weekDates.filter(d => activeFilters.includes(format(d, 'EEE')));

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const returnTo = window.location.pathname + window.location.search;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'select_account consent',
      state: returnTo,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) { router.replace('/'); return; }
    const blocks = decodeAvailability(data);
    setTheirBlocks(blocks);

    const token = loadToken();
    if (!token) { setConnected(false); setLoading(false); return; }

    setConnected(true);
    fetchBusyBlocks(token, 14)
      .then(blocks => setMyBlocks(blocks))
      .catch(() => setError('Could not load your calendar.'))
      .finally(() => setLoading(false));
  }, [searchParams, router]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    const token = loadToken();
    if (!token) { handleConnect(); return; }
    setBooking(true);
    try {
      await createCalendarEvent(token, 'ClearSlot Session', selectedSlot.start, selectedSlot.end);
      setBooked(true);
    } catch {
      alert('Could not add to calendar. Try again.');
    } finally {
      setBooking(false);
    }
  };

  const handleShare = async () => {
    if (!myBlocks.length) return;
    const link = buildShareLink(myBlocks);
    if (navigator.share) {
      try { await navigator.share({ text: `Here is my availability:\n\n${link}` }); return; } catch {}
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDayFilter = (day: string) => {
    setActiveFilters(prev =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter(d => d !== day) : prev
        : [...prev, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    );
  };

  const applyPreset = (preset: 'all' | 'workWeek') => {
    setActiveFilters(preset === 'all' ? ALL_DAYS : WORK_DAYS);
  };

  const navigateWeek = (dir: 1 | -1) => setSelectedDate(d => addDays(d, dir * 7));
  const freeGaps = getFreeGaps(selectedDate, myBlocks, theirBlocks);

  // ── Not connected: welcoming landing page ─────────────────────────────────
  if (!connected && !loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
        <div className="flex items-center px-5 pt-10 pb-2">
          <button onClick={() => router.replace('/')} className="flex items-center gap-1.5 text-[13px] text-[#22C55E] font-medium cursor-pointer">
            <span style={{ fontSize: 16 }}>←</span> Back
          </button>
        </div>
        <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 rounded-2xl bg-[#e8f5d0] border-2 border-[#c8e89a] flex items-center justify-center shadow-sm">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <rect x="3" y="7" width="32" height="26" rx="4" fill="#d4f7dc" stroke="#22C55E" strokeWidth="2"/>
                <rect x="3" y="7" width="32" height="8" rx="4" fill="#4ADE80"/>
                <rect x="3" y="11" width="32" height="4" fill="#4ADE80"/>
                <circle cx="12" cy="4" r="2" fill="#22C55E"/>
                <circle cx="26" cy="4" r="2" fill="#22C55E"/>
                <rect x="9" y="19" width="6" height="5" rx="1" fill="#4ADE80"/>
                <rect x="17" y="19" width="6" height="5" rx="1" fill="#4ADE80"/>
                <rect x="9" y="26" width="6" height="4" rx="1" fill="#c8e89a"/>
                <rect x="17" y="26" width="6" height="4" rx="1" fill="#c8e89a"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#22C55E] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-[26px] font-bold text-[#111111] leading-tight mb-3">You've been invited!</h1>
          <p className="text-[15px] text-[#5a6a4a] leading-6 max-w-xs">
            Someone shared their schedule with you. Connect your Google Calendar to find the best time to meet.
          </p>
        </div>
        {/* How it works — 3 steps */}
        <div className="mx-5 mb-8 flex flex-col gap-3">
          {[
            { icon: '📅', title: 'Connect your calendar', desc: 'Sign in with Google — read-only, no data stored.' },
            { icon: '🔍', title: 'We find the overlap', desc: 'Your free windows are compared side by side.' },
            { icon: '✅', title: 'Pick a time', desc: 'Green blocks = you\'re both free. Tap one to book.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white border border-[#e0e8d0] px-4 py-4 shadow-sm flex items-start gap-4">
              <span className="text-[22px] leading-none mt-0.5">{icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-[#2a3e1a] mb-1">{title}</p>
                <p className="text-[12px] text-[#7a8a6a] leading-5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 mt-auto pb-12">
          <button
            onClick={handleConnect}
            className="w-full bg-[#22C55E] rounded-2xl py-5 flex items-center justify-center gap-3 text-[16px] font-semibold text-white cursor-pointer shadow-md active:scale-[0.98] transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="3" width="18" height="14" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
              <path d="M1 7h18" stroke="white" strokeWidth="1.5"/>
              <circle cx="6" cy="2" r="1.5" fill="white"/>
              <circle cx="14" cy="2" r="1.5" fill="white"/>
            </svg>
            Connect Google Calendar
          </button>
          <p className="text-center text-[12px] text-[#9aaa8a] mt-4">Read-only access · No events stored · Free</p>
        </div>
      </div>
    );
  }

  // ── Connected: full calendar view ─────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: isMobile ? '0 16px' : '0 32px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 16 }}>
        <span style={{ fontSize: 21, fontWeight: 300, letterSpacing: '-0.06em', flexShrink: 0 }}>clearslot</span>

        <div style={{ display: 'flex', gap: 2, backgroundColor: '#ffffff', border: '1px solid #1a1a1a', borderRadius: 9, padding: 3 }}>
          {(['day', 'workWeek', 'week'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => {
              setViewMode(mode);
              if (mode === 'workWeek') setActiveFilters(WORK_DAYS);
              if (mode === 'week') setActiveFilters(ALL_DAYS);
            }} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.1s', backgroundColor: viewMode === mode ? '#d8d8d2' : 'transparent', color: viewMode === mode ? '#0a0a0a' : '#555' }}>
              {mode === 'day' ? 'Day' : mode === 'workWeek' ? 'Work Week' : 'Week'}
            </button>
          ))}
        </div>

        {viewMode !== 'day' && (
          <button onClick={() => setShowFilter(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, border: `1px solid ${showFilter ? '#22C55E' : '#dededa'}`, background: showFilter ? 'rgba(34,197,94,0.08)' : '#ffffff', color: showFilter ? '#22C55E' : '#555', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 2h10M3 6h6M5 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filter days
            {activeFilters.length < ALL_DAYS.length && (
              <span style={{ backgroundColor: '#22C55E', color: '#FFFFFF', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{activeFilters.length}</span>
            )}
          </button>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#555', flexShrink: 0 }}>{format(new Date(), 'MMMM yyyy')}</span>
        <button onClick={() => { if (confirm('Disconnect your Google Calendar?')) { clearToken(); router.replace('/'); } }}
          style={{ fontSize: 13, color: '#777', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          Disconnect
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && viewMode !== 'day' && (
        <div style={{ borderBottom: '1px solid #e2e2dc', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginRight: 4 }}>Show</span>
          <button onClick={() => applyPreset('workWeek')}
            style={{ padding: '4px 11px', borderRadius: 6, fontSize: 12, border: `1px solid ${JSON.stringify(activeFilters) === JSON.stringify(WORK_DAYS) ? '#22C55E' : '#d8d8d2'}`, background: JSON.stringify(activeFilters) === JSON.stringify(WORK_DAYS) ? 'rgba(34,197,94,0.08)' : '#fafaf7', color: JSON.stringify(activeFilters) === JSON.stringify(WORK_DAYS) ? '#22C55E' : '#777', cursor: 'pointer' }}>
            Work week
          </button>
          <button onClick={() => applyPreset('all')}
            style={{ padding: '4px 11px', borderRadius: 6, fontSize: 12, border: `1px solid ${JSON.stringify(activeFilters) === JSON.stringify(ALL_DAYS) ? '#22C55E' : '#d8d8d2'}`, background: JSON.stringify(activeFilters) === JSON.stringify(ALL_DAYS) ? 'rgba(34,197,94,0.08)' : '#fafaf7', color: JSON.stringify(activeFilters) === JSON.stringify(ALL_DAYS) ? '#22C55E' : '#777', cursor: 'pointer' }}>
            Full week
          </button>
          <div style={{ width: 1, height: 16, backgroundColor: '#dededa', margin: '0 4px' }} />
          {ALL_DAYS.map(day => (
            <button key={day} onClick={() => toggleDayFilter(day)}
              style={{ width: 36, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 500, border: `1px solid ${activeFilters.includes(day) ? '#22C55E' : '#dededa'}`, background: activeFilters.includes(day) ? 'rgba(34,197,94,0.1)' : '#fafaf7', color: activeFilters.includes(day) ? '#22C55E' : '#555', cursor: 'pointer' }}>
              {day}
            </button>
          ))}
        </div>
      )}

      {/* Date nav */}
      {viewMode === 'day' ? (
        <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 32px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          {dayStripDates.map(date => {
            const active = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = isSameDay(date, new Date());
            return (
              <button key={date.toISOString()} onClick={() => setSelectedDate(date)}
                style={{ flexShrink: 0, width: 52, padding: '7px 0', borderRadius: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${active ? '#22C55E' : '#dededa'}`, background: active ? 'rgba(34,197,94,0.08)' : '#ffffff', cursor: 'pointer' }}>
                <span style={{ fontSize: 9, color: active ? '#22C55E' : '#555', marginBottom: 3, letterSpacing: '0.08em' }}>{format(date, 'EEE').toUpperCase()}</span>
                <span style={{ fontSize: 17, fontWeight: 600, color: active ? '#22C55E' : isToday ? '#444' : '#555' }}>{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => navigateWeek(-1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#ffffff', color: '#777', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <span style={{ fontSize: 13, color: '#555', minWidth: 180 }}>{format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}</span>
          <button onClick={() => navigateWeek(1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#ffffff', color: '#777', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          <button onClick={() => setSelectedDate(new Date())} style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid #1a1a1a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Today</button>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* Main: compact overlap grid */}
        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', overflowX: 'auto', padding: isMobile ? '16px 16px 32px' : '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80, gap: 12 }}>
              <div style={{ width: 20, height: 20, border: '2px solid #22C55E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: '#777' }}>Reading your calendar...</p>
            </div>
          ) : error ? (
            <p style={{ fontSize: 14, color: '#555', textAlign: 'center', marginTop: 80 }}>{error}</p>
          ) : (
            <div style={{ backgroundColor: '#1a1a18', borderRadius: 20, padding: '28px 28px 24px', maxWidth: 780 }}>
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#f0f0ea', letterSpacing: '-0.02em' }}>When you are both free</span>
                <span style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600 }}>
                  {freeGaps.length} slots found
                </span>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, gap: 6 }}>
                {/* Day headers */}
                <div />
                {weekDates.map(date => (
                  <div key={date.toISOString()} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: isSameDay(date, new Date()) ? '#22C55E' : '#666', letterSpacing: '0.06em', paddingBottom: 4 }}>
                    {format(date, 'EEE').toUpperCase()[0]}
                  </div>
                ))}

                {/* Time block rows */}
                {TIME_BLOCKS.map(block => (
                  <>
                    <div key={block.label + '-label'} style={{ fontSize: 10, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontWeight: 500 }}>
                      {block.shortLabel}
                    </div>
                    {weekDates.map(date => {
                      const state = getBlockState(date, block.startH, block.endH, myBlocks, theirBlocks);
                      const isPast = date < new Date() && !isSameDay(date, new Date());
                      return (
                        <div key={date.toISOString() + block.label} style={{
                          height: 54, borderRadius: 10,
                          backgroundColor: isPast ? '#222220' : BLOCK_COLOR[state],
                          opacity: isPast ? 0.4 : 1,
                          border: state === 'bothBusy' ? '1px solid #2a2a28' : 'none',
                          transition: 'opacity 0.1s',
                        }} />
                      );
                    })}
                  </>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
                {[
                  { color: '#22C55E', label: 'Both free' },
                  { color: '#22C55E', label: 'You free' },
                  { color: '#1c3461', label: 'Them free' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#888' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color, display: 'inline-block' }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side panel — free windows + booking */}
        <div style={{ width: isMobile ? '100%' : 288, borderLeft: isMobile ? 'none' : '1px solid #e2e2dc', borderTop: isMobile ? '1px solid #e2e2dc' : 'none', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

          {/* Share */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e2dc' }}>
            {!loading && (
              <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginBottom: 8 }}>
                {myBlocks.length === 0 ? 'No events loaded' : `${myBlocks.length} events across 14 days`}
              </p>
            )}
            <button onClick={handleShare} disabled={loading || myBlocks.length === 0}
              style={{ width: '100%', backgroundColor: '#22C55E', color: '#fff', borderRadius: 11, padding: '13px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading || myBlocks.length === 0 ? 0.4 : 1 }}>
              {copied ? 'Link copied!' : 'Share my availability'}
            </button>
          </div>

          {/* Mutual free windows */}
          <div style={{ padding: '22px 22px 18px' }}>
            <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 13 }}>
              Open times · {format(selectedDate, 'EEE d')}
            </p>

            {loading ? null : freeGaps.length === 0 ? (
              <p style={{ fontSize: 12, color: '#999990' }}>No mutual free time today</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {freeGaps.map((gap, i) => {
                  const mins = differenceInMinutes(gap.end, gap.start);
                  const hrs = Math.floor(mins / 60), rem = mins % 60;
                  const dur = hrs > 0 ? `${hrs}h${rem > 0 ? ` ${rem}m` : ''}` : `${rem}m`;
                  const isSelected = selectedSlot?.start.getTime() === gap.start.getTime();
                  return (
                    <button key={i} onClick={() => { setSelectedSlot(isSelected ? null : gap); setBooked(false); }}
                      style={{ padding: '9px 12px', backgroundColor: isSelected ? 'rgba(34,197,94,0.1)' : '#ffffff', border: `1px solid ${isSelected ? '#22C55E' : '#e2e2dc'}`, borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', width: '100%' }}>
                      <span style={{ fontSize: 12, color: '#444' }}>{format(gap.start, 'h:mm a')} – {format(gap.end, 'h:mm a')}</span>
                      <span style={{ fontSize: 10, color: '#16A34A', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 7px', borderRadius: 999, flexShrink: 0, marginLeft: 8 }}>{dur}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Book selected slot */}
          {selectedSlot && (
            <div style={{ margin: '0 22px 18px', padding: '12px', backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 11 }}>
              <p style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{format(selectedSlot.start, 'EEE, MMM d')}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111111', marginBottom: 10 }}>
                {format(selectedSlot.start, 'h:mm a')} – {format(selectedSlot.end, 'h:mm a')}
              </p>
              {booked ? (
                <p style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>✓ Added to your calendar!</p>
              ) : (
                <button onClick={handleBook} disabled={booking}
                  style={{ width: '100%', backgroundColor: '#22C55E', color: '#fff', borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: booking ? 0.6 : 1 }}>
                  {booking ? 'Booking...' : 'Add to Calendar'}
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

export default function OverlapPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    }>
      <OverlapContent />
    </Suspense>
  );
}
