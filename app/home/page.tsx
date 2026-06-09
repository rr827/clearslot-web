'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, differenceInMinutes, startOfWeek, isSameDay } from 'date-fns';
import { loadToken, clearToken } from '@/lib/auth';
import { fetchBusyBlocks, BusyBlock } from '@/lib/calendar';
import { buildShareLink, parseShareLink } from '@/lib/payload';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import { useIsMobile } from '@/lib/useIsMobile';

type ViewMode = 'day' | 'workWeek' | 'week';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getFreeGaps(date: Date, myBlocks: BusyBlock[], theirBlocks?: BusyBlock[]) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayStart = new Date(date); dayStart.setHours(6, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(22, 0, 0, 0);
  const now = new Date();

  const allBusy = [
    ...myBlocks.filter(b => format(new Date(b.start), 'yyyy-MM-dd') === dateStr),
    ...(theirBlocks ?? []).filter(b => format(new Date(b.start), 'yyyy-MM-dd') === dateStr),
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

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [blocks, setBlocks] = useState<BusyBlock[]>([]);
  const [theirBlocks, setTheirBlocks] = useState<BusyBlock[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [activeFilters, setActiveFilters] = useState<string[]>(ALL_DAYS);
  const [showFilter, setShowFilter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');

  const dayStripDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const weekDates = getWeekDates(selectedDate);

  // Apply day filters to week view
  const visibleDates = viewMode === 'day'
    ? [selectedDate]
    : weekDates.filter(d => activeFilters.includes(format(d, 'EEE')));

  const loadCalendar = useCallback(async () => {
    const token = loadToken();
    if (!token) { router.replace('/'); return; }
    setLoading(true); setError(null);
    try {
      setBlocks(await fetchBusyBlocks(token, 14));
    } catch {
      setError('Could not load calendar. Click to retry.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const handleShare = async () => {
    if (!blocks.length) return;
    const link = buildShareLink(blocks);
    if (navigator.share) {
      try { await navigator.share({ text: `Here is my availability:\n\n${link}` }); return; } catch {}
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddTheirCalendar = () => {
    setLinkError('');
    const parsed = parseShareLink(linkInput.trim());
    if (!parsed || parsed.length === 0) {
      setLinkError('Invalid link — ask them to share their availability link.');
      return;
    }
    setTheirBlocks(parsed);
    setLinkInput('');
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

  const freeGaps = getFreeGaps(selectedDate, blocks, theirBlocks ?? undefined);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: isMobile ? '0 16px' : '0 32px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 16 }}>
        <span style={{ fontSize: 21, fontWeight: 300, letterSpacing: '-0.06em', flexShrink: 0 }}>clearslot</span>

        {/* View mode tabs */}
        <div style={{ display: 'flex', gap: 2, backgroundColor: '#ffffff', border: '1px solid #1a1a1a', borderRadius: 9, padding: 3 }}>
          {(['day', 'workWeek', 'week'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => {
              setViewMode(mode);
              if (mode === 'workWeek') setActiveFilters(WORK_DAYS);
              if (mode === 'week') setActiveFilters(ALL_DAYS);
            }}
              style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.1s',
                backgroundColor: viewMode === mode ? '#d8d8d2' : 'transparent',
                color: viewMode === mode ? '#0a0a0a' : '#555' }}>
              {mode === 'day' ? 'Day' : mode === 'workWeek' ? 'Work Week' : 'Week'}
            </button>
          ))}
        </div>

        {/* Filter toggle (week modes only) */}
        {viewMode !== 'day' && (
          <button onClick={() => setShowFilter(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, border: `1px solid ${showFilter ? '#22C55E' : '#dededa'}`, background: showFilter ? 'rgba(34,197,94,0.08)' : '#ffffff', color: showFilter ? '#22C55E' : '#555', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 2h10M3 6h6M5 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filter days
            {activeFilters.length < ALL_DAYS.length && (
              <span style={{ backgroundColor: '#22C55E', color: '#FFFFFF', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                {activeFilters.length}
              </span>
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

      {/* Date navigation bar */}
      {viewMode === 'day' ? (
        <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 32px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          {dayStripDates.map(date => {
            const active = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = isSameDay(date, new Date());
            return (
              <button key={date.toISOString()} onClick={() => setSelectedDate(date)}
                style={{ flexShrink: 0, width: 52, padding: '7px 0', borderRadius: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${active ? '#22C55E' : '#dededa'}`, background: active ? 'rgba(34,197,94,0.08)' : '#ffffff', cursor: 'pointer' }}>
                <span style={{ fontSize: 9, color: active ? '#22C55E' : '#555', marginBottom: 3, letterSpacing: '0.08em' }}>
                  {format(date, 'EEE').toUpperCase()}
                </span>
                <span style={{ fontSize: 17, fontWeight: 600, color: active ? '#22C55E' : isToday ? '#444' : '#555' }}>
                  {format(date, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => navigateWeek(-1)}
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#ffffff', color: '#777', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <span style={{ fontSize: 13, color: '#555', minWidth: 180 }}>
            {format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}
          </span>
          <button onClick={() => navigateWeek(1)}
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#ffffff', color: '#777', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          <button onClick={() => setSelectedDate(new Date())}
            style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid #1a1a1a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Today
          </button>
          {visibleDates.length === 0 && (
            <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>No days selected — use filter to add days</span>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* Calendar main */}
        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0 0 48px' }}>

          {/* Multi-day column headers */}
          {viewMode !== 'day' && visibleDates.length > 0 && (
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e2dc', padding: '0 0 0 32px', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', zIndex: 10 }}>
              <div style={{ width: 44, flexShrink: 0 }} />
              {visibleDates.map((date, di) => {
                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <div key={date.toISOString()} onClick={() => { setSelectedDate(date); setViewMode('day'); }}
                    style={{ flex: 1, padding: '10px 6px', textAlign: 'center', cursor: 'pointer', borderLeft: di > 0 ? '1px solid #111' : 'none' }}>
                    <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.1em', marginBottom: 5 }}>
                      {format(date, 'EEE').toUpperCase()}
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? '#22C55E' : isSelected ? '#d8d8d2' : 'transparent' }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: isToday ? '#FFFFFF' : isSelected ? '#222' : '#555' }}>
                        {format(date, 'd')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div style={{ padding: '18px 32px 14px' }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>
                {format(selectedDate, 'EEEE, MMMM d')}
              </p>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80, gap: 12 }}>
              <div style={{ width: 20, height: 20, border: '2px solid #22C55E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: '#777' }}>Reading your calendar...</p>
            </div>
          ) : error ? (
            <button onClick={loadCalendar} style={{ width: '100%', textAlign: 'center', marginTop: 80, fontSize: 14, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer' }}>
              {error}
            </button>
          ) : visibleDates.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80, gap: 8 }}>
              <p style={{ fontSize: 14, color: '#555' }}>No days selected</p>
              <button onClick={() => setShowFilter(true)} style={{ fontSize: 13, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer' }}>
                Open filter to add days →
              </button>
            </div>
          ) : (
            <div style={{ padding: viewMode === 'day' ? '0 32px' : '0 0 0 32px' }}>
              {theirBlocks && (
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                  {[
                    { color: '#4ADE80', label: 'Both free' },
                    { color: '#fef3b0', label: 'Only me free' },
                    { color: '#bde0f5', label: 'Only them free' },
                    { color: '#b8b8b0', label: 'Both busy' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#666' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
              <AvailabilityGrid dates={visibleDates} myBlocks={blocks} theirBlocks={theirBlocks ?? undefined} />
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: isMobile ? '100%' : 288, borderLeft: isMobile ? 'none' : '1px solid #e2e2dc', borderTop: isMobile ? '1px solid #e2e2dc' : 'none', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

          {/* Share */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e2dc' }}>
            {!loading && (
              <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginBottom: 8 }}>
                {blocks.length === 0 ? 'No events loaded' : `${blocks.length} events across 14 days`}
              </p>
            )}
            <button onClick={handleShare} disabled={loading || blocks.length === 0}
              style={{ width: '100%', backgroundColor: '#22C55E', color: '#fff', borderRadius: 11, padding: '13px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: loading || blocks.length === 0 ? 0.4 : 1 }}>
              {copied ? 'Link copied!' : 'Share my availability'}
            </button>
          </div>

          {/* Free windows */}
          <div style={{ padding: '22px 22px 18px' }}>
            <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 13 }}>
              {theirBlocks ? 'Mutual free time' : 'Free windows'}
              {viewMode !== 'day' && <span style={{ color: '#999990' }}> · {format(selectedDate, 'EEE d')}</span>}
            </p>

            {loading ? null : freeGaps.length === 0 ? (
              <p style={{ fontSize: 12, color: '#999990' }}>No free windows today</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {freeGaps.map((gap, i) => {
                  const mins = differenceInMinutes(gap.end, gap.start);
                  const hrs = Math.floor(mins / 60), rem = mins % 60;
                  const dur = hrs > 0 ? `${hrs}h${rem > 0 ? ` ${rem}m` : ''}` : `${rem}m`;
                  return (
                    <div key={i} style={{ padding: '9px 12px', backgroundColor: '#ffffff', border: '1px solid #161616', borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#444' }}>{format(gap.start, 'h:mm a')} – {format(gap.end, 'h:mm a')}</span>
                      <span style={{ fontSize: 10, color: '#16A34A', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 7px', borderRadius: 999, flexShrink: 0, marginLeft: 8 }}>{dur}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ height: 1, backgroundColor: '#e8e8e2', margin: '0 22px' }} />

          {/* Add their calendar */}
          <div style={{ padding: '18px 22px 22px' }}>
            <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
              {theirBlocks ? 'Their calendar added' : 'Add their calendar'}
            </p>

            {theirBlocks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '9px 12px', backgroundColor: 'rgba(36,113,163,0.07)', border: '1px solid rgba(36,113,163,0.2)', borderRadius: 9 }}>
                  <p style={{ fontSize: 11, color: '#1a6090' }}>Calendar loaded · {theirBlocks.length} events</p>
                </div>
                <button onClick={() => setTheirBlocks(null)}
                  style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid #1a1a1a', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', width: '100%' }}>
                  Remove their calendar
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 11, color: '#444', marginBottom: 11, lineHeight: 1.65 }}>
                  Ask them to tap "Share my availability" and paste the link below.
                </p>
                <textarea
                  value={linkInput}
                  onChange={e => { setLinkInput(e.target.value); setLinkError(''); }}
                  placeholder="Paste their link here..."
                  style={{ width: '100%', height: 68, backgroundColor: '#ffffff', border: '1px solid #1a1a1a', borderRadius: 9, padding: '9px 11px', fontSize: 12, color: '#333', resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'system-ui, sans-serif' }}
                />
                {linkError && <p style={{ fontSize: 11, color: '#d0245e', marginTop: 5 }}>{linkError}</p>}
                <button onClick={handleAddTheirCalendar} disabled={!linkInput.trim()}
                  style={{ marginTop: 9, width: '100%', padding: '10px', backgroundColor: linkInput.trim() ? '#22C55E' : '#fafaf7', color: linkInput.trim() ? '#FFFFFF' : '#777', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: linkInput.trim() ? 'pointer' : 'default' }}>
                  Compare calendars
                </button>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
