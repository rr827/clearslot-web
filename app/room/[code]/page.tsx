'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  format, addDays, startOfWeek, isSameDay, parseISO, addMinutes,
} from 'date-fns';
import Logo from '../../components/Logo';
import { useIsMobile } from '@/lib/useIsMobile';
import { BusyBlock } from '@/lib/calendar';
import { decodePayload, AlignedPayload, buildRoomLink } from '@/lib/payload';
import { RoomRow, Proposal } from '@/lib/room';
import { generateIcsEvent } from '@/lib/ics';
import { captureClientEvent } from '@/lib/analyticsClient';

// ── Types ──────────────────────────────────────────────────────────────────

type DailyView = 'swimlane' | 'grid';

const ROOM_BG = '#F8F9FC';
const ROOM_SURFACE = '#FFFFFF';
const ROOM_BORDER = '#E8EBF0';
const ROOM_MUTED = '#667085';
const ROOM_MUTED_SOFT = '#98A2B3';
const ROOM_TEXT = '#111827';
const ROOM_ACCENT = '#3D9A5C';
const ROOM_ACCENT_DARK = '#2F7B49';
const ROOM_ACCENT_SOFT = 'rgba(61,154,92,0.10)';
const ROOM_ACCENT_BORDER = 'rgba(61,154,92,0.22)';
const ROOM_SHADOW = '0 16px 34px rgba(15, 23, 42, 0.06), 0 2px 10px rgba(15, 23, 42, 0.04)';

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekDates(base: Date): Date[] {
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

type DailyTimeRange = { from: string; to: string };

/** Expand recurring daily time ranges into concrete BusyBlocks over a date range */
function expandRecurringRanges(
  range: { start: string; end: string },
  recurringRanges: DailyTimeRange[] | null | undefined
): BusyBlock[] {
  if (!recurringRanges?.length) return [];
  const result: BusyBlock[] = [];
  const rangeStart = new Date(range.start + 'T00:00:00');
  const rangeEnd = new Date(range.end + 'T23:59:59');
  for (let d = new Date(rangeStart); d <= rangeEnd; d = new Date(d.getTime() + 86400000)) {
    for (const recurringRange of recurringRanges) {
      const [fH, fM] = recurringRange.from.split(':').map(Number);
      const [tH, tM] = recurringRange.to.split(':').map(Number);
      const blockStart = new Date(d);
      blockStart.setHours(fH, fM, 0, 0);
      const blockEnd = new Date(d);
      blockEnd.setHours(tH, tM, 0, 0);
      if (blockEnd <= blockStart) {
        blockEnd.setDate(blockEnd.getDate() + 1);
      }
      const clippedStart = blockStart < rangeStart ? rangeStart : blockStart;
      const clippedEnd = blockEnd > rangeEnd ? rangeEnd : blockEnd;
      if (clippedEnd > clippedStart) {
        result.push({ start: clippedStart.toISOString(), end: clippedEnd.toISOString() });
      }
    }
  }
  return result;
}

function getParticipantBusyBlocks(payload: AlignedPayload): BusyBlock[] {
  return [
    ...payload.blocks,
    ...expandRecurringRanges(payload.range, payload.blocked),
    ...expandRecurringRanges(payload.range, payload.sleep ? [payload.sleep] : null),
  ];
}

/** How many of the participants are free during [slotStart, slotEnd] */
function overlapCount(
  slotStart: Date,
  slotEnd: Date,
  allBlocks: BusyBlock[][]
): number {
  return allBlocks.filter(blocks =>
    !blocks.some(b => {
      const bs = parseISO(b.start), be = parseISO(b.end);
      return bs < slotEnd && be > slotStart;
    })
  ).length;
}

/** Busy blocks for a participant on a given date */
function getDayBusy(date: Date, blocks: BusyBlock[]): { startMin: number; endMin: number }[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return blocks
    .filter(b => format(parseISO(b.start), 'yyyy-MM-dd') === dateStr)
    .map(b => ({
      startMin: parseISO(b.start).getHours() * 60 + parseISO(b.start).getMinutes(),
      endMin: parseISO(b.end).getHours() * 60 + parseISO(b.end).getMinutes(),
    }));
}

function rankSlots(
  allBlocks: BusyBlock[][],
  preferences: (string | null)[],
  weekDates: Date[]
): { start: Date; end: Date; count: number; score: number }[] {
  const slots: { start: Date; end: Date; count: number; score: number }[] = [];
  const now = new Date();

  for (const date of weekDates) {
    for (let h = 6; h < 22; h++) {
      const slotStart = new Date(date);
      slotStart.setHours(h, 0, 0, 0);
      if (slotStart <= now) continue;
      const slotEnd = addMinutes(slotStart, 60);
      const count = overlapCount(slotStart, slotEnd, allBlocks);
      if (count === 0 || count < allBlocks.length) continue;
      let score = count * 10;
      preferences.forEach(p => {
        if (p === 'morning' && h >= 6 && h < 12) score += 3;
        if (p === 'afternoon' && h >= 12 && h < 18) score += 3;
        if (p === 'evening' && h >= 18) score += 3;
      });
      slots.push({ start: slotStart, end: slotEnd, count, score });
    }
  }

  const sorted = slots.sort((a, b) => b.score - a.score);

  // Prefer one slot per day, so the top 3 give a variety of days when possible.
  const picked: typeof sorted = [];
  const usedDays = new Set<string>();
  for (const slot of sorted) {
    if (picked.length >= 3) break;
    const dayKey = format(slot.start, 'yyyy-MM-dd');
    if (!usedDays.has(dayKey)) {
      picked.push(slot);
      usedDays.add(dayKey);
    }
  }
  // Fewer than 3 days had a qualifying slot — fill remaining spots by score.
  for (const slot of sorted) {
    if (picked.length >= 3) break;
    if (!picked.includes(slot)) picked.push(slot);
  }

  return picked.sort((a, b) => b.score - a.score);
}

type SelectedRange = { start: Date; end: Date } | null;

const PARTICIPANT_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#A855F7', '#6366F1'];
const PARTICIPANT_BG_COLORS = [
  'rgba(59,130,246,0.56)',   // blue
  'rgba(239,68,68,0.56)',    // red
  'rgba(245,158,11,0.56)',   // amber
  'rgba(168,85,247,0.56)',   // purple
  'rgba(99,102,241,0.56)',   // indigo
];

function participantLabel(participant: AlignedPayload | undefined, index: number): string {
  const name = participant?.displayName?.trim();
  if (name) {
    const pieces = name.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = pieces.map((piece) => piece[0]?.toUpperCase() ?? '').join('');
    if (initials) return initials;
  }
  return String(index + 1);
}

// ── WeekView grid constants ─────────────────────────────────────────────────
const HOUR_HEIGHT = 56; // px per hour
const GRID_DAY_START = 6;
const GRID_DAY_END = 22;
const GRID_TOTAL_HOURS = GRID_DAY_END - GRID_DAY_START; // 16
const GRID_H = GRID_TOTAL_HOURS * HOUR_HEIGHT; // 896px

const DAY_START = 6 * 60;
const DAY_END = 22 * 60;
const DURATION = DAY_END - DAY_START;

function snapTo5(min: number): number {
  return Math.round(min / 5) * 5;
}

function yToMin(y: number, height: number): number {
  const raw = GRID_DAY_START * 60 + (y / height) * GRID_TOTAL_HOURS * 60;
  return Math.max(GRID_DAY_START * 60, Math.min(GRID_DAY_END * 60, snapTo5(raw)));
}

function WeekGridLines() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: GRID_H, pointerEvents: 'none' }}>
      {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
        const y = i * HOUR_HEIGHT;
        return (
          <g key={i}>
            {/* Hour — solid */}
            <line x1={0} y1={y} x2="100%" y2={y} stroke={ROOM_BORDER} strokeWidth={1} />
            {i < GRID_TOTAL_HOURS && (
              <>
                {/* 30-min — dashed */}
                <line x1={0} y1={y + HOUR_HEIGHT / 2} x2="100%" y2={y + HOUR_HEIGHT / 2}
                  stroke="#D9DEE7" strokeWidth={0.8} strokeDasharray="4 4" />
                {/* 15-min — light dashed */}
                <line x1={0} y1={y + HOUR_HEIGHT / 4} x2="100%" y2={y + HOUR_HEIGHT / 4}
                  stroke="#EDF1F5" strokeWidth={0.6} strokeDasharray="2 6" />
                <line x1={0} y1={y + (HOUR_HEIGHT * 3) / 4} x2="100%" y2={y + (HOUR_HEIGHT * 3) / 4}
                  stroke="#EDF1F5" strokeWidth={0.6} strokeDasharray="2 6" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function WeekView({
  weekDates, allBlocks, selectedRange, onRangeChange,
}: {
  weekDates: Date[];
  allBlocks: BusyBlock[][];
  selectedRange: SelectedRange;
  onRangeChange: (range: SelectedRange) => void;
}) {
  const [drag, setDrag] = useState<{ day: Date; startMin: number; endMin: number } | null>(null);
  const dragStateRef = useRef<{ day: Date; startMin: number; endMin: number } | null>(null);
  const dragColRef = useRef<HTMLDivElement | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  useEffect(() => { onRangeChangeRef.current = onRangeChange; });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !dragColRef.current) return;
      const rect = dragColRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const min = yToMin(y, rect.height);
      const updated = { ...dragStateRef.current, endMin: min };
      dragStateRef.current = updated;
      setDrag({ ...updated });
    };
    const onUp = () => {
      const d = dragStateRef.current;
      if (!d) return;
      const s = Math.min(d.startMin, d.endMin);
      const e2 = Math.max(d.startMin, d.endMin);
      if (e2 - s < 5) {
        // Short click = deselect
        onRangeChangeRef.current(null);
      } else {
        const start = new Date(d.day); start.setHours(Math.floor(s / 60), s % 60, 0, 0);
        const end = new Date(d.day); end.setHours(Math.floor(e2 / 60), e2 % 60, 0, 0);
        onRangeChangeRef.current({ start, end });
      }
      dragStateRef.current = null;
      dragColRef.current = null;
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    const colEl = e.currentTarget;
    const rect = colEl.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const min = yToMin(y, rect.height);
    const newDrag = { day, startMin: min, endMin: min };
    dragStateRef.current = newDrag;
    dragColRef.current = colEl;
    setDrag(newDrag);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 560 }}>
      {/* Day header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        <div />
        {weekDates.map(date => (
          <div key={date.toISOString()} style={{ textAlign: 'center', padding: '6px 0', fontSize: 16, fontWeight: 600, color: isSameDay(date, new Date()) ? '#22C55E' : '#6B7280', letterSpacing: '0.05em' }}>
            <div>{format(date, 'EEE').toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isSameDay(date, new Date()) ? '#22C55E' : '#374151' }}>{format(date, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Time labels */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: GRID_H }}>
          {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
            const h = GRID_DAY_START + i;
            return (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 6, fontSize: 13, color: '#9CA3AF', lineHeight: 1 }}>
                {i === 0 ? '' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            );
          })}
        </div>

        {/* Day columns */}
        {weekDates.map(date => {
          const selOnThisDay = selectedRange && isSameDay(selectedRange.start, date);
          const dragOnThisDay = drag && isSameDay(drag.day, date);

          const toTopPct = (min: number) =>
            ((min - GRID_DAY_START * 60) / (GRID_TOTAL_HOURS * 60)) * 100;

          const selStartPct = selOnThisDay
            ? toTopPct(selectedRange!.start.getHours() * 60 + selectedRange!.start.getMinutes())
            : 0;
          const selEndPct = selOnThisDay
            ? toTopPct(selectedRange!.end.getHours() * 60 + selectedRange!.end.getMinutes())
            : 0;

          const dragStartMin = drag ? Math.min(drag.startMin, drag.endMin) : 0;
          const dragEndMin = drag ? Math.max(drag.startMin, drag.endMin) : 0;
          const dragStartPct = dragOnThisDay ? toTopPct(dragStartMin) : 0;
          const dragEndPct = dragOnThisDay ? toTopPct(dragEndMin) : 0;

          const busyForDay = allBlocks.map(blocks => getDayBusy(date, blocks));
          const numParticipants = allBlocks.length;

          return (
            <div
              key={date.toISOString()}
              onMouseDown={e => handleMouseDown(e, date)}
              style={{
                flex: 1,
                height: GRID_H,
                backgroundColor: '#DCFCE7',
                position: 'relative',
                cursor: 'crosshair',
                userSelect: 'none',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <WeekGridLines />

              {/* Busy blocks — sweep-line: one flat div per interval, color by overlap */}
              {(() => {
                type Ev = { time: number; type: 'start' | 'end'; pIdx: number };
                const events: Ev[] = [];
                busyForDay.forEach((segs, pIdx) => {
                  segs.forEach(seg => {
                    const s = Math.max(seg.startMin, GRID_DAY_START * 60);
                    const e = Math.min(seg.endMin, GRID_DAY_END * 60);
                    if (e > s) {
                      events.push({ time: s, type: 'start', pIdx });
                      events.push({ time: e, type: 'end', pIdx });
                    }
                  });
                });
                events.sort((a, b) => a.time !== b.time ? a.time - b.time : (a.type === 'end' ? -1 : 1));

                const active = new Set<number>();
                const intervals: { start: number; end: number; count: number; firstPIdx: number }[] = [];
                let prevTime = GRID_DAY_START * 60;

                for (const ev of events) {
                  if (ev.time > prevTime && active.size > 0) {
                    intervals.push({ start: prevTime, end: ev.time, count: active.size, firstPIdx: [...active][0] });
                  }
                  if (ev.type === 'start') active.add(ev.pIdx);
                  else active.delete(ev.pIdx);
                  prevTime = ev.time;
                }

                return intervals.map((iv, k) => {
                  const top = toTopPct(iv.start);
                  const height = toTopPct(iv.end) - top;
                  let color: string;
                  if (iv.count === 1) {
                    color = PARTICIPANT_BG_COLORS[iv.firstPIdx % PARTICIPANT_BG_COLORS.length];
                  } else {
                    // Progressive darkening: more participants = darker gray
                    const fraction = iv.count / Math.max(numParticipants, 2);
                    const base = Math.round(115 - fraction * 70); // 45–115
                    const alpha = (0.50 + fraction * 0.30).toFixed(2);
                    color = `rgba(${base},${base},${base},${alpha})`;
                  }
                  return (
                    <div key={k} style={{
                      position: 'absolute',
                      top: `${top}%`,
                      height: `${height}%`,
                      left: 0,
                      width: '100%',
                      backgroundColor: color,
                      pointerEvents: 'none',
                    }} />
                  );
                });
              })()}

              {/* Selection overlay */}
              {selOnThisDay && selEndPct > selStartPct && (
                <div style={{
                  position: 'absolute',
                  top: `${selStartPct}%`,
                  height: `${selEndPct - selStartPct}%`,
                  left: 0, right: 0,
                  backgroundColor: 'rgba(74,222,128,0.6)',
                  border: '2px solid #22C55E',
                  borderRadius: 3,
                  pointerEvents: 'none',
                }} />
              )}

              {/* Drag preview */}
              {dragOnThisDay && dragEndPct > dragStartPct && (
                <div style={{
                  position: 'absolute',
                  top: `${dragStartPct}%`,
                  height: `${dragEndPct - dragStartPct}%`,
                  left: 0, right: 0,
                  backgroundColor: 'rgba(74,222,128,0.6)',
                  border: '2px solid #22C55E',
                  borderRadius: 3,
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SwimLaneView({
  date, participants, allBlocks, onRangeChange, selectedRange,
}: {
  date: Date;
  participants: AlignedPayload[];
  allBlocks: BusyBlock[][];
  onRangeChange: (range: SelectedRange) => void;
  selectedRange: SelectedRange;
}) {
  const toPercent = (min: number) => ((min - DAY_START) / DURATION) * 100;

  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null);
  const dragStateRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const dragBarRef = useRef<HTMLDivElement | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  useEffect(() => { onRangeChangeRef.current = onRangeChange; });
  const dateRef = useRef(date);
  useEffect(() => { dateRef.current = date; });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !dragBarRef.current) return;
      const rect = dragBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const raw = DAY_START + (x / rect.width) * DURATION;
      const min = Math.max(DAY_START, Math.min(DAY_END, snapTo5(raw)));
      const updated = { ...dragStateRef.current, endMin: min };
      dragStateRef.current = updated;
      setDrag({ ...updated });
    };
    const onUp = () => {
      const d = dragStateRef.current;
      if (!d) return;
      const s = Math.min(d.startMin, d.endMin);
      const e2 = Math.max(d.startMin, d.endMin);
      if (e2 - s < 5) {
        onRangeChangeRef.current(null);
      } else {
        const day = dateRef.current;
        const start = new Date(day); start.setHours(Math.floor(s / 60), s % 60, 0, 0);
        const end = new Date(day); end.setHours(Math.floor(e2 / 60), e2 % 60, 0, 0);
        onRangeChangeRef.current({ start, end });
      }
      dragStateRef.current = null;
      dragBarRef.current = null;
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const barEl = e.currentTarget;
    const rect = barEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const raw = DAY_START + (x / rect.width) * DURATION;
    const min = Math.max(DAY_START, Math.min(DAY_END, snapTo5(raw)));
    const newDrag = { startMin: min, endMin: min };
    dragStateRef.current = newDrag;
    dragBarRef.current = barEl;
    setDrag(newDrag);
  };

  // Overlap bands
  const overlapBands: { startMin: number; endMin: number }[] = [];
  if (participants.length > 0) {
    for (let m = DAY_START; m < DAY_END; m += 15) {
      const slotStart = new Date(date); slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
      if (overlapCount(slotStart, addMinutes(slotStart, 15), allBlocks) === participants.length) {
        if (overlapBands.length && overlapBands[overlapBands.length - 1].endMin === m) {
          overlapBands[overlapBands.length - 1].endMin = m + 15;
        } else {
          overlapBands.push({ startMin: m, endMin: m + 15 });
        }
      }
    }
  }

  // Drag preview bounds
  const dragStartMin = drag ? Math.min(drag.startMin, drag.endMin) : 0;
  const dragEndMin = drag ? Math.max(drag.startMin, drag.endMin) : 0;

  // Selection bounds (only show if date matches)
  const selStartMin = selectedRange ? selectedRange.start.getHours() * 60 + selectedRange.start.getMinutes() : 0;
  const selEndMin = selectedRange ? selectedRange.end.getHours() * 60 + selectedRange.end.getMinutes() : 0;
  const selVisible = selectedRange !== null && selEndMin > DAY_START && selStartMin < DAY_END;

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Time axis */}
      <div style={{ position: 'relative', height: 20, marginLeft: 100, minWidth: 600, marginBottom: 8 }}>
        {[6, 9, 12, 15, 18, 21].map(h => (
          <span key={h} style={{ position: 'absolute', left: `${toPercent(h * 60)}%`, fontSize: 15, color: '#aaa', transform: 'translateX(-50%)' }}>
            {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
          </span>
        ))}
      </div>

      {/* Person rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 600 }}>
        {participants.map((p, i) => {
          const busySegments = getDayBusy(date, p.blocks);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 92, fontSize: 17, color: '#555', textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], marginRight: 5 }} />
                Person {i + 1}
              </div>
              <div
                onMouseDown={handleMouseDown}
                style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: '#DCFCE7', position: 'relative', cursor: 'crosshair', overflow: 'hidden', userSelect: 'none' }}>
                {/* Busy blocks */}
                {busySegments.map((seg, j) => (
                  <div key={j} style={{
                    position: 'absolute',
                    left: `${toPercent(seg.startMin)}%`,
                    width: `${toPercent(seg.endMin) - toPercent(seg.startMin)}%`,
                    top: 0, bottom: 0,
                    backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
                    opacity: 0.65,
                    pointerEvents: 'none',
                  }} />
                ))}
                {/* Selection overlay */}
                {selVisible && (
                  <div style={{
                    position: 'absolute',
                    left: `${toPercent(Math.max(selStartMin, DAY_START))}%`,
                    width: `${toPercent(Math.min(selEndMin, DAY_END)) - toPercent(Math.max(selStartMin, DAY_START))}%`,
                    top: 0, bottom: 0,
                    backgroundColor: 'rgba(74,222,128,0.6)',
                    border: '2px solid #22C55E',
                    borderRadius: 4,
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Drag preview */}
                {drag && dragEndMin > dragStartMin && (
                  <div style={{
                    position: 'absolute',
                    left: `${toPercent(dragStartMin)}%`,
                    width: `${toPercent(dragEndMin) - toPercent(dragStartMin)}%`,
                    top: 0, bottom: 0,
                    backgroundColor: 'rgba(74,222,128,0.6)',
                    border: '2px solid #22C55E',
                    borderRadius: 4,
                    pointerEvents: 'none',
                  }} />
                )}
              </div>
            </div>
          );
        })}

        {/* Overlap band */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 92, fontSize: 16, color: '#22C55E', textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>Overlap</div>
          <div style={{ flex: 1, height: 20, borderRadius: 8, backgroundColor: '#F0FDF4', position: 'relative', overflow: 'hidden' }}>
            {overlapBands.map((band, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${toPercent(band.startMin)}%`,
                width: `${toPercent(band.endMin) - toPercent(band.startMin)}%`,
                top: 0, bottom: 0,
                backgroundColor: '#22C55E',
                borderRadius: 3,
              }} />
            ))}
          </div>
        </div>

        {/* Live drag time label */}
        {drag && dragEndMin > dragStartMin && (
          <div style={{ marginLeft: 100, fontSize: 15, color: '#22C55E', fontWeight: 500 }}>
            {format(new Date(date).setHours(Math.floor(dragStartMin / 60), dragStartMin % 60), 'h:mm a')}
            {' – '}
            {format(new Date(date).setHours(Math.floor(dragEndMin / 60), dragEndMin % 60), 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
}

function GridDayView({
  date, allBlocks, onRangeChange, selectedRange,
}: {
  date: Date;
  participants: AlignedPayload[];
  allBlocks: BusyBlock[][];
  onRangeChange: (range: SelectedRange) => void;
  selectedRange: SelectedRange;
}) {
  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null);
  const dragStateRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const dragColRef = useRef<HTMLDivElement | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  useEffect(() => { onRangeChangeRef.current = onRangeChange; });
  const dateRef = useRef(date);
  useEffect(() => { dateRef.current = date; });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !dragColRef.current) return;
      const rect = dragColRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const min = yToMin(y, rect.height);
      const updated = { ...dragStateRef.current, endMin: min };
      dragStateRef.current = updated;
      setDrag({ ...updated });
    };
    const onUp = () => {
      const d = dragStateRef.current;
      if (!d) return;
      const s = Math.min(d.startMin, d.endMin);
      const e2 = Math.max(d.startMin, d.endMin);
      if (e2 - s < 5) {
        onRangeChangeRef.current(null);
      } else {
        const day = dateRef.current;
        const start = new Date(day); start.setHours(Math.floor(s / 60), s % 60, 0, 0);
        const end = new Date(day); end.setHours(Math.floor(e2 / 60), e2 % 60, 0, 0);
        onRangeChangeRef.current({ start, end });
      }
      dragStateRef.current = null;
      dragColRef.current = null;
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const colEl = e.currentTarget;
    const rect = colEl.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const min = yToMin(y, rect.height);
    const newDrag = { startMin: min, endMin: min };
    dragStateRef.current = newDrag;
    dragColRef.current = colEl;
    setDrag(newDrag);
  };

  const toTopPct = (min: number) =>
    ((min - GRID_DAY_START * 60) / (GRID_TOTAL_HOURS * 60)) * 100;

  const selOnThisDay = selectedRange && isSameDay(selectedRange.start, date);
  const selStartPct = selOnThisDay ? toTopPct(selectedRange!.start.getHours() * 60 + selectedRange!.start.getMinutes()) : 0;
  const selEndPct = selOnThisDay ? toTopPct(selectedRange!.end.getHours() * 60 + selectedRange!.end.getMinutes()) : 0;

  const dragStartMin = drag ? Math.min(drag.startMin, drag.endMin) : 0;
  const dragEndMin = drag ? Math.max(drag.startMin, drag.endMin) : 0;
  const dragStartPct = drag ? toTopPct(dragStartMin) : 0;
  const dragEndPct = drag ? toTopPct(dragEndMin) : 0;

  const busyForDay = allBlocks.map(blocks => getDayBusy(date, blocks));
  const numParticipants = allBlocks.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Day header */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 2, marginBottom: 4 }}>
        <div />
        <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 16, fontWeight: 600, color: isSameDay(date, new Date()) ? '#22C55E' : '#6B7280', letterSpacing: '0.05em' }}>
          <div>{format(date, 'EEE').toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: isSameDay(date, new Date()) ? '#22C55E' : '#374151' }}>{format(date, 'd')}</div>
        </div>
      </div>

      {/* Grid body */}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Time labels */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: GRID_H }}>
          {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
            const h = GRID_DAY_START + i;
            return (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 6, fontSize: 13, color: '#9CA3AF', lineHeight: 1 }}>
                {i === 0 ? '' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            );
          })}
        </div>

        {/* Day column */}
        <div
          onMouseDown={handleMouseDown}
          style={{ flex: 1, height: GRID_H, backgroundColor: '#DCFCE7', position: 'relative', cursor: 'crosshair', userSelect: 'none', borderRadius: 4, overflow: 'hidden' }}
        >
          <WeekGridLines />

          {/* Busy blocks — same sweep-line logic as WeekView */}
          {(() => {
            type Ev = { time: number; type: 'start' | 'end'; pIdx: number };
            const events: Ev[] = [];
            busyForDay.forEach((segs, pIdx) => {
              segs.forEach(seg => {
                const s = Math.max(seg.startMin, GRID_DAY_START * 60);
                const e = Math.min(seg.endMin, GRID_DAY_END * 60);
                if (e > s) {
                  events.push({ time: s, type: 'start', pIdx });
                  events.push({ time: e, type: 'end', pIdx });
                }
              });
            });
            events.sort((a, b) => a.time !== b.time ? a.time - b.time : (a.type === 'end' ? -1 : 1));

            const active = new Set<number>();
            const intervals: { start: number; end: number; count: number; firstPIdx: number }[] = [];
            let prevTime = GRID_DAY_START * 60;

            for (const ev of events) {
              if (ev.time > prevTime && active.size > 0) {
                intervals.push({ start: prevTime, end: ev.time, count: active.size, firstPIdx: [...active][0] });
              }
              if (ev.type === 'start') active.add(ev.pIdx);
              else active.delete(ev.pIdx);
              prevTime = ev.time;
            }

            return intervals.map((iv, k) => {
              const top = toTopPct(iv.start);
              const height = toTopPct(iv.end) - top;
              let color: string;
              if (iv.count === 1) {
                color = PARTICIPANT_BG_COLORS[iv.firstPIdx % PARTICIPANT_BG_COLORS.length];
              } else {
                const fraction = iv.count / Math.max(numParticipants, 2);
                const base = Math.round(115 - fraction * 70);
                const alpha = (0.50 + fraction * 0.30).toFixed(2);
                color = `rgba(${base},${base},${base},${alpha})`;
              }
              return (
                <div key={k} style={{
                  position: 'absolute', top: `${top}%`, height: `${height}%`,
                  left: 0, width: '100%',
                  backgroundColor: color, pointerEvents: 'none',
                }} />
              );
            });
          })()}

          {selOnThisDay && selEndPct > selStartPct && (
            <div style={{
              position: 'absolute', top: `${selStartPct}%`, height: `${selEndPct - selStartPct}%`,
              left: 0, right: 0, backgroundColor: 'rgba(74,222,128,0.6)',
              border: '2px solid #22C55E', borderRadius: 3, pointerEvents: 'none',
            }} />
          )}

          {drag && dragEndPct > dragStartPct && (
            <div style={{
              position: 'absolute', top: `${dragStartPct}%`, height: `${dragEndPct - dragStartPct}%`,
              left: 0, right: 0, backgroundColor: 'rgba(74,222,128,0.6)',
              border: '2px solid #22C55E', borderRadius: 3, pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton helper ─────────────────────────────────────────────────────────

function Sk({ w, h, r = 6, style }: { w?: string | number; h: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w ?? '100%', height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg, #e8e8e2 25%, #f2f2ec 50%, #e8e8e2 75%)',
      backgroundSize: '200% 100%',
      animation: 'skshimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ── Main component ──────────────────────────────────────────────────────────

function RoomContent() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [roomParticipantCount, setRoomParticipantCount] = useState(0);
  const [roomJoinable, setRoomJoinable] = useState(true);

  const [participants, setParticipants] = useState<AlignedPayload[]>([]);
  const [allBlocks, setAllBlocks] = useState<BusyBlock[][]>([]);
  const [myIndex, setMyIndex] = useState<number | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekBase, setWeekBase] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [dailyView, setDailyView] = useState<DailyView>('swimlane');

  const [rankedSlots, setRankedSlots] = useState<{ start: Date; end: Date; count: number; score: number }[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectedRange>(null);
  const [proposing, setProposing] = useState(false);
  const [proposed, setProposed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null);
  const [decliningIdx, setDecliningIdx] = useState<number | null>(null);
  const [downloadedIcsIdx, setDownloadedIcsIdx] = useState<number | null>(null);
  const [eventTitles, setEventTitles] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAppBanner, setShowAppBanner] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobileUA) return;

    let cancelled = false;
    const cancelFallback = () => { cancelled = true; };
    const onVisibilityChange = () => {
      if (document.hidden) cancelFallback();
    };

    // Give the OS a chance to hand off to the installed app. If the tab is
    // still visible after ~1.5s, assume it's not installed and show the
    // download banner instead of waiting indefinitely.
    const timer = setTimeout(() => {
      if (!cancelled) setShowAppBanner(true);
    }, 1500);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', cancelFallback);

    window.location.href = `clearslot://room?code=${code}`;

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', cancelFallback);
    };
  }, [code]);

  // Manual time entry
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  const weekDates = getWeekDates(weekBase);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/room/${code}`);
        if (!res.ok) { setError('Room not found or expired.'); setLoading(false); return; }
        const data: (RoomRow & { participantIndex?: number }) | { code: string; expiresAt: string; participantCount: number; joinable: boolean } = await res.json();

        if (!('participants' in data)) {
          setAnonymous(true);
          setRoomParticipantCount(data.participantCount);
          setRoomJoinable(data.joinable);
          setLoading(false);
          return;
        }

        setRoom(data);

        const decoded = data.participants.map(p => decodePayload(p));
        setParticipants(decoded);
        setAllBlocks(decoded.map(getParticipantBusyBlocks));

        if (data.participantIndex !== undefined) {
          setMyIndex(data.participantIndex);
        } else {
          const idx = localStorage.getItem(`room_${code}`);
          setMyIndex(idx !== null ? parseInt(idx) : null);
        }

        const expandedBlocks = decoded.map(getParticipantBusyBlocks);
        const slots = rankSlots(expandedBlocks, decoded.map(p => p.preference), weekDates);
        setRankedSlots(slots);
      } catch {
        setError('Failed to load room.');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Re-rank when week changes
  useEffect(() => {
    if (participants.length === 0) return;
    setRankedSlots(rankSlots(allBlocks, participants.map(p => p.preference), weekDates));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBase]);

  const handleCopyLink = async () => {
    const url = buildRoomLink(code);
    await navigator.clipboard.writeText(url);
    captureClientEvent('room_link_copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePropose = async () => {
    if (!selectedRange || myIndex === null) return;
    setProposing(true);
    try {
      const res = await fetch('/api/room/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, startTime: selectedRange.start.toISOString(), endTime: selectedRange.end.toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to propose');
      }
      captureClientEvent('room_proposal_created', {
        duration_minutes: Math.max(
          5,
          Math.round((selectedRange.end.getTime() - selectedRange.start.getTime()) / 60_000)
        ),
      });
      setActionError(null);
      setProposed(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save proposal. Try again.');
    } finally {
      setProposing(false);
    }
  };

  const handleAccept = async (proposalIndex: number) => {
    setAcceptingIdx(proposalIndex);
    // Optimistic update
    setRoom(prev => {
      if (!prev) return prev;
      const proposals = prev.proposals.map((p, i) =>
        i === proposalIndex ? { ...p, status: 'accepted' as const } : p
      );
      return { ...prev, proposals };
    });
    try {
      const res = await fetch('/api/room/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, proposalIndex }),
      });
      if (!res.ok) throw new Error('Failed to accept');
      captureClientEvent('room_proposal_accepted');
      setActionError(null);
    } catch {
      // Revert on failure
      setRoom(prev => {
        if (!prev) return prev;
        const proposals = prev.proposals.map((p, i) =>
          i === proposalIndex ? { ...p, status: 'pending' as const } : p
        );
        return { ...prev, proposals };
      });
      setActionError('Could not accept proposal. Try again.');
    } finally {
      setAcceptingIdx(null);
    }
  };

  const handleDecline = async (proposalIndex: number) => {
    setDecliningIdx(proposalIndex);
    setRoom(prev => {
      if (!prev) return prev;
      const proposals = prev.proposals.map((p, i) =>
        i === proposalIndex ? { ...p, status: 'declined' as const } : p
      );
      return { ...prev, proposals };
    });
    try {
      const res = await fetch('/api/room/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, proposalIndex }),
      });
      if (!res.ok) throw new Error('Failed to decline');
      captureClientEvent('room_proposal_declined');
      setActionError(null);
    } catch {
      setRoom(prev => {
        if (!prev) return prev;
        const proposals = prev.proposals.map((p, i) =>
          i === proposalIndex ? { ...p, status: 'pending' as const } : p
        );
        return { ...prev, proposals };
      });
      setActionError('Could not decline proposal. Try again.');
    } finally {
      setDecliningIdx(null);
    }
  };

  const handleDownloadIcs = (proposalIndex: number, prop: Proposal) => {
    try {
      const title = eventTitles[proposalIndex]?.trim() || 'ClearSlot Meeting';
      const ics = generateIcsEvent({
        start: prop.start_time,
        end: prop.end_time,
        title,
        description: 'Scheduled with ClearSlot — https://clearslot.net',
      });
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const startDate = parseISO(prop.start_time);
      const fileStamp = [
        format(startDate, 'yyyy-MM-dd'),
        format(startDate, 'HHmm'),
      ].join('-');
      anchor.href = url;
      anchor.download = `clearslot-meeting-${fileStamp}.ics`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      captureClientEvent('room_proposal_ics_downloaded');
      setActionError(null);
      setDownloadedIcsIdx(proposalIndex);
      window.setTimeout(() => {
        setDownloadedIcsIdx((prev) => (prev === proposalIndex ? null : prev));
      }, 2000);
    } catch {
      setActionError('Could not generate the calendar file. Try again.');
    }
  };

  const handleSlotClick = (slot: { start: Date; end: Date }) => {
    setSelectedRange(prev => {
      if (!prev) return { start: slot.start, end: slot.end };
      if (prev.start.getTime() === slot.start.getTime() && prev.end.getTime() === slot.end.getTime()) return null;
      return {
        start: slot.start < prev.start ? slot.start : prev.start,
        end: slot.end > prev.end ? slot.end : prev.end,
      };
    });
    setProposed(false);
    setSelectedDate(slot.start);
  };

  const handleRangeChange = (range: SelectedRange) => {
    setSelectedRange(range);
    setProposed(false);
    if (range) setSelectedDate(range.start);
  };

  const handleJoin = () => router.push(`/connect?room=${code}`);


  const handleUpdatePreferences = () => {
    if (myIndex === null) return;
    const mine = participants[myIndex];
    if (!mine) return;

    sessionStorage.setItem('aligned_questionnaire', JSON.stringify({
      range: mine.range,
      sleep: mine.sleep ?? null,
      preference: mine.preference ?? null,
      includeAllDay: mine.includeAllDay ?? true,
      blocked: mine.blocked ?? null,
    }));
    sessionStorage.setItem('aligned_room_action', `update:${code}`);
    router.push(`/connect?room=${code}&edit=1`);
  };

  // Join buttons are shown based on room membership (myIndex), not calendar connection.
  // This prevents room creators from seeing join buttons after a browser restart.

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <style>{`@keyframes skshimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>

      {/* Header skeleton */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '0 28px', height: 86, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Sk w={96} h={22} />
        <Sk w={130} h={34} r={10} />
        <div style={{ display: 'flex' }}>
          {[0, 1].map(i => <Sk key={i} w={24} h={24} r={12} style={{ marginLeft: i > 0 ? -8 : 0 }} />)}
        </div>
        <div style={{ flex: 1 }} />
        <Sk w={118} h={34} r={9} />
      </div>

      {/* Date nav skeleton */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Sk w={26} h={26} r={6} />
        <Sk w={190} h={18} />
        <Sk w={26} h={26} r={6} />
        <Sk w={58} h={28} r={6} />
      </div>

      {/* Body skeleton */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Week grid skeleton */}
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

        {/* Side panel skeleton */}
        <div style={{ width: 288, borderLeft: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk h={46} r={11} />
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk w={110} h={13} />
            {[0, 1, 2].map(i => <Sk key={i} h={72} r={9} />)}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', backgroundColor: ROOM_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, backgroundColor: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 24, padding: '28px 26px', boxShadow: ROOM_SHADOW, textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: ROOM_ACCENT_DARK, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>Room unavailable</p>
        <h1 style={{ fontSize: 28, lineHeight: 1.15, color: ROOM_TEXT, margin: '0 0 12px' }}>
          {error.includes('expired') || error.includes('not found') ? 'This room link is no longer active' : 'ClearSlot could not open this room'}
        </h1>
        <p style={{ fontSize: 15, color: ROOM_MUTED, lineHeight: 1.7, margin: '0 0 20px' }}>{error}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => router.replace('/connect')} style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#fff', backgroundColor: ROOM_ACCENT, border: 'none', borderRadius: 14, padding: '13px 16px', cursor: 'pointer' }}>
            Start a new room
          </button>
          <button onClick={() => router.replace('/')} style={{ width: '100%', fontSize: 15, fontWeight: 600, color: ROOM_ACCENT_DARK, backgroundColor: ROOM_ACCENT_SOFT, border: `1px solid ${ROOM_ACCENT_BORDER}`, borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
            Go home
          </button>
        </div>
      </div>
    </div>
  );

  if (anonymous) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, color: '#111', margin: 0 }}>You&apos;re invited to a ClearSlot room</h1>
      <p style={{ fontSize: 16, color: '#555', maxWidth: 360, margin: 0 }}>
        {roomParticipantCount === 1
          ? 'One person is already in this room.'
          : `${roomParticipantCount} people are already in this room.`}
        {' '}Connect your calendar to see overlapping availability and suggest times.
      </p>
      {roomJoinable ? (
        <button onClick={handleJoin} style={{ fontSize: 18, color: '#fff', background: '#22C55E', border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer', fontWeight: 600 }}>
          Join this room
        </button>
      ) : (
        <p style={{ fontSize: 15, color: '#888' }}>This room is full.</p>
      )}
      <button onClick={() => router.replace('/connect')} style={{ fontSize: 15, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Start a new room instead</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: ROOM_BG, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif', color: ROOM_TEXT }}>

      {/* Mobile app download banner */}
      {showAppBanner && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: ROOM_SURFACE, padding: '16px 20px 32px', boxShadow: '0 -8px 30px rgba(15,23,42,0.16)' }}>
          <button
            onClick={() => setShowAppBanner(false)}
            style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'rgba(61,154,92,0.55)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
            aria-label="Dismiss"
          >×</button>
          <p style={{ color: ROOM_ACCENT_DARK, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>Get the app</p>
          <p style={{ color: '#374151', fontSize: 15, margin: '0 0 14px', lineHeight: 1.4 }}>
            Open this room in the ClearSlot app for a better experience.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`clearslot://room?code=${code}`}
              style={{ flex: 1, backgroundColor: ROOM_ACCENT, color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center', padding: '11px 0', borderRadius: 10, textDecoration: 'none' }}
            >
              Open in App
            </a>
            <span
              style={{ flex: 1, backgroundColor: ROOM_ACCENT_SOFT, color: ROOM_ACCENT_DARK, fontSize: 15, fontWeight: 600, textAlign: 'center', padding: '11px 0', borderRadius: 10, textDecoration: 'none', border: `1px solid ${ROOM_ACCENT_BORDER}` }}
            >
              App Store soon
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${ROOM_BORDER}`, backgroundColor: 'rgba(248,249,252,0.9)', backdropFilter: 'blur(10px)', padding: isMobile ? '0 16px' : '0 28px', height: 88, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <Logo iconSize={52} textSize={40} />

        {/* Room code badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 14, padding: '7px 12px', boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
          <span style={{ fontSize: 13, color: ROOM_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.16em', color: ROOM_TEXT, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{code}</span>
        </div>

        {/* Participant count */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {participants.map((participant, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, border: `2px solid ${ROOM_SURFACE}`, marginLeft: i > 0 ? -8 : 0, boxShadow: '0 3px 10px rgba(15,23,42,0.12)' }}>
              {participantLabel(participant, i)}
            </div>
          ))}
          <span style={{ fontSize: 15, color: ROOM_MUTED, marginLeft: 8 }}>{participants.length} {participants.length === 1 ? 'person' : 'people'}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, backgroundColor: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 11, padding: 3, boxShadow: '0 4px 14px rgba(15,23,42,0.03)' }}>
          {(['week', 'day'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: viewMode === m ? ROOM_ACCENT_SOFT : 'transparent', color: viewMode === m ? ROOM_ACCENT_DARK : ROOM_MUTED }}>
              {m === 'week' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>

        {viewMode === 'day' && (
          <div style={{ display: 'flex', gap: 2, backgroundColor: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 11, padding: 3 }}>
            {(['swimlane', 'grid'] as DailyView[]).map(v => (
              <button key={v} onClick={() => setDailyView(v)}
                  style={{ padding: '5px 10px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: dailyView === v ? ROOM_ACCENT_SOFT : 'transparent', color: dailyView === v ? ROOM_ACCENT_DARK : ROOM_MUTED, textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>
        )}

        {/* Help button */}
        <button
          onClick={() => setShowHelp(h => !h)}
          title="How to use ClearSlot"
          style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${ROOM_BORDER}`, background: showHelp ? ROOM_ACCENT_SOFT : ROOM_SURFACE, color: showHelp ? ROOM_ACCENT_DARK : ROOM_MUTED, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ?
        </button>
      </div>

      {/* Help overlay panel */}
      {showHelp && (
        <div style={{ position: 'fixed', top: 88, right: 0, bottom: 0, width: isMobile ? '100%' : 320, backgroundColor: ROOM_SURFACE, borderLeft: `1px solid ${ROOM_BORDER}`, zIndex: 200, overflowY: 'auto', padding: '24px 20px', boxShadow: '-8px 0 28px rgba(15,23,42,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>How to use ClearSlot</span>
            <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { n: '1', title: 'Drag on the calendar', body: 'Click and drag on the grid to highlight the time slot you want to meet.' },
              { n: '2', title: 'Suggest the time', body: 'After dragging, click "Suggest this time" in the side panel to share your pick.' },
              { n: '3', title: 'Others accept', body: 'Everyone in the room sees your proposal and can accept it. Once accepted, download an .ics file to add it to any calendar.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: ROOM_ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#111', margin: '0 0 3px' }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0f0ea' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Color guide</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PARTICIPANT_COLORS.slice(0, 3).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: PARTICIPANT_BG_COLORS[i] }} />
                  <span style={{ fontSize: 13, color: '#555' }}>Person {i + 1}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'rgba(90,90,90,0.65)' }} />
                <span style={{ fontSize: 13, color: '#555' }}>Everyone busy</span>
              </div>
            </div>
          </div>

          <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 24, textAlign: 'center', fontSize: 13, color: ROOM_ACCENT_DARK, fontWeight: 600 }}>
            Full guide →
          </a>
        </div>
      )}

      {/* Date nav */}
      <div style={{ borderBottom: `1px solid ${ROOM_BORDER}`, padding: isMobile ? '12px 16px' : '12px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.75)' }}>
        {viewMode === 'week' ? (
          <>
            <button onClick={() => setWeekBase(d => addDays(d, -7))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${ROOM_BORDER}`, background: ROOM_SURFACE, cursor: 'pointer', fontSize: 18, color: ROOM_MUTED }}>←</button>
            <span style={{ fontSize: 16, color: ROOM_MUTED, minWidth: 180, fontWeight: 600 }}>{format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}</span>
            <button onClick={() => setWeekBase(d => addDays(d, 7))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${ROOM_BORDER}`, background: ROOM_SURFACE, cursor: 'pointer', fontSize: 18, color: ROOM_MUTED }}>→</button>
            <button onClick={() => setWeekBase(new Date())} style={{ fontSize: 14, color: ROOM_MUTED, background: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>Today</button>
          </>
        ) : (
          <>
            <button onClick={() => setSelectedDate(d => addDays(d, -1))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${ROOM_BORDER}`, background: ROOM_SURFACE, cursor: 'pointer', fontSize: 18, color: ROOM_MUTED }}>←</button>
            <span style={{ fontSize: 16, color: ROOM_MUTED, minWidth: 160, fontWeight: 600 }}>{format(selectedDate, 'EEEE, MMMM d')}</span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${ROOM_BORDER}`, background: ROOM_SURFACE, cursor: 'pointer', fontSize: 18, color: ROOM_MUTED }}>→</button>
            <button onClick={() => setSelectedDate(new Date())} style={{ fontSize: 14, color: ROOM_MUTED, background: ROOM_SURFACE, border: `1px solid ${ROOM_BORDER}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>Today</button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* Main view area */}
        <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', overflowX: 'auto', padding: isMobile ? '16px 14px 24px' : '32px 36px 52px' }}>
          {participants.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#888', fontSize: 19 }}>
              <p style={{ marginBottom: 8 }}>No one has connected yet.</p>
              {myIndex === null && <button onClick={handleJoin} style={{ fontSize: 19, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Be the first to join →</button>}
            </div>
          ) : (
            <>
              {/* Solo nudge */}
              {participants.length === 1 && myIndex === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: ROOM_ACCENT_SOFT, border: `1px solid ${ROOM_ACCENT_BORDER}`, borderRadius: 14, padding: '12px 16px', marginBottom: 18, gap: 12, boxShadow: ROOM_SHADOW }}>
                  <span style={{ fontSize: 14, color: ROOM_ACCENT_DARK }}>You&apos;re the only one here — share the link to invite others</span>
                  <button onClick={handleCopyLink} style={{ fontSize: 13, fontWeight: 600, color: ROOM_ACCENT_DARK, background: ROOM_SURFACE, border: `1px solid ${ROOM_ACCENT_BORDER}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {copied ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
              )}
              {/* Drag hint */}
              {myIndex !== null && !selectedRange && (
                <p style={{ textAlign: 'center', color: ROOM_MUTED_SOFT, fontSize: 13, fontStyle: 'italic', marginBottom: 14, pointerEvents: 'none' }}>
                  Drag on the calendar to select a time
                </p>
              )}
            </>
          )}
          {participants.length > 0 && viewMode === 'week' ? (
            <WeekView weekDates={weekDates} allBlocks={allBlocks} selectedRange={selectedRange} onRangeChange={handleRangeChange} />
          ) : dailyView === 'swimlane' ? (
            <SwimLaneView date={selectedDate} participants={participants} allBlocks={allBlocks} onRangeChange={handleRangeChange} selectedRange={selectedRange} />
          ) : (
            <GridDayView date={selectedDate} participants={participants} allBlocks={allBlocks} onRangeChange={handleRangeChange} selectedRange={selectedRange} />
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: isMobile ? '100%' : 316, borderLeft: isMobile ? 'none' : `1px solid ${ROOM_BORDER}`, borderTop: isMobile ? `1px solid ${ROOM_BORDER}` : 'none', backgroundColor: ROOM_SURFACE, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, boxShadow: isMobile ? 'none' : '-8px 0 24px rgba(15,23,42,0.04)' }}>

          {/* Share / Join */}
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${ROOM_BORDER}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleCopyLink}
              style={{ width: '100%', backgroundColor: ROOM_ACCENT, color: '#fff', borderRadius: 14, padding: '13px', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 12px 24px rgba(61,154,92,0.16)' }}>
              {copied ? '✓ Link copied!' : 'Copy invite link'}
            </button>
            {myIndex === null && (
              <button onClick={handleJoin}
                style={{ width: '100%', backgroundColor: ROOM_SURFACE, color: ROOM_ACCENT_DARK, borderRadius: 14, padding: '13px', fontSize: 16, fontWeight: 700, border: `1px solid ${ROOM_ACCENT_BORDER}`, cursor: 'pointer' }}>
                Join this room
              </button>
            )}
            {myIndex !== null && (
              <button
                onClick={handleUpdatePreferences}
                style={{ width: '100%', backgroundColor: ROOM_SURFACE, color: ROOM_ACCENT_DARK, borderRadius: 14, padding: '13px', fontSize: 15, fontWeight: 700, border: `1px solid ${ROOM_ACCENT_BORDER}`, cursor: 'pointer' }}
              >
                Update my availability
              </button>
            )}
          </div>

          {actionError && (
            <div style={{ margin: '16px 20px 0', padding: '12px 14px', borderRadius: 14, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Action could not be completed</p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7F1D1D' }}>{actionError}</p>
                </div>
                <button
                  onClick={() => setActionError(null)}
                  style={{ background: 'none', border: 'none', color: '#B91C1C', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0 }}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Proposals list */}
          {room?.proposals && room.proposals.length > 0 && (
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${ROOM_BORDER}` }}>
              <p style={{ fontSize: 13, color: ROOM_MUTED, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12, fontWeight: 700 }}>Proposals</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {room.proposals.map((prop, i) => {
                  const isAccepted = prop.status === 'accepted';
                  const isDeclined = prop.status === 'declined';
                  const isPending = prop.status === 'pending';
                  const isOwnProposal = myIndex !== null && prop.proposer_index === myIndex;
                  const actionBusy = acceptingIdx === i || decliningIdx === i;
                  return (
                    <div key={i} style={{ padding: '12px 13px', borderRadius: 14, backgroundColor: isAccepted ? ROOM_ACCENT_SOFT : '#FBFCFE', border: `1px solid ${isAccepted ? ROOM_ACCENT_BORDER : ROOM_BORDER}` }}>
                      <p style={{ fontSize: 13, color: ROOM_MUTED, marginBottom: 6 }}>Person {prop.proposer_index + 1} suggests</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
                        {format(parseISO(prop.start_time), 'EEE MMM d')}
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: ROOM_TEXT, background: ROOM_ACCENT_SOFT, borderRadius: 8, padding: '4px 8px', display: 'inline-block', marginBottom: 10 }}>
                        {format(parseISO(prop.start_time), 'h:mm a')} – {format(parseISO(prop.end_time), 'h:mm a')}
                      </p>
                      {isAccepted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 14, color: '#22C55E', fontWeight: 700 }}>Accepted</span>
                          <input
                            type="text"
                            placeholder="Event title (optional, default: ClearSlot Meeting)"
                            value={eventTitles[i] ?? ''}
                            onChange={e => setEventTitles(prev => ({ ...prev, [i]: e.target.value }))}
                            style={{ padding: '8px 10px', borderRadius: 10, border: `1px solid ${ROOM_BORDER}`, fontSize: 13, color: '#333', backgroundColor: ROOM_SURFACE }}
                          />
                          {downloadedIcsIdx === i ? (
                            <span style={{ fontSize: 14, color: ROOM_ACCENT_DARK, fontWeight: 700 }}>.ics downloaded</span>
                          ) : (
                            <button
                              onClick={() => handleDownloadIcs(i, prop)}
                              style={{ fontSize: 14, color: ROOM_ACCENT_DARK, background: ROOM_SURFACE, border: `1px solid ${ROOM_ACCENT_BORDER}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}>
                              Download .ics
                            </button>
                          )}
                          <span style={{ fontSize: 12, color: '#888' }}>
                            Import into Google Calendar, Apple Calendar, Outlook, or any calendar app that supports .ics files.
                          </span>
                          <div style={{ marginTop: 4, paddingTop: 8, borderTop: `1px solid ${ROOM_BORDER}` }}>
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Want ClearSlot for your next group?{' '}</span>
                            <a href="/connect" style={{ fontSize: 12, color: ROOM_ACCENT, fontWeight: 600, textDecoration: 'none' }}>Create a room free →</a>
                          </div>
                        </div>
                      ) : isDeclined ? (
                        <span style={{ fontSize: 14, color: '#aaa' }}>Declined</span>
                      ) : isPending ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {isOwnProposal && (
                            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 2px' }}>You proposed this</p>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleAccept(i)}
                              disabled={actionBusy}
                              style={{ flex: 1, backgroundColor: ROOM_ACCENT, color: '#fff', borderRadius: 10, padding: '10px', fontSize: 15, fontWeight: 700, border: 'none', cursor: actionBusy ? 'not-allowed' : 'pointer', opacity: actionBusy ? 0.6 : 1 }}>
                              {acceptingIdx === i ? 'Accepting…' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleDecline(i)}
                              disabled={actionBusy}
                              style={{ flex: 1, backgroundColor: ROOM_SURFACE, color: '#6B7280', borderRadius: 10, padding: '10px', fontSize: 15, fontWeight: 600, border: `1px solid ${ROOM_BORDER}`, cursor: actionBusy ? 'not-allowed' : 'pointer', opacity: actionBusy ? 0.6 : 1 }}>
                              {decliningIdx === i ? 'Declining…' : 'Decline'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, color: '#aaa', textTransform: 'capitalize' }}>{prop.status}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best slots */}
          <div style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: 13, color: ROOM_MUTED, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12, fontWeight: 700 }}>
              Best times · {rankedSlots.length} found
            </p>
            {participants.length < 2 ? (
              <p style={{ fontSize: 17, color: '#aaa' }}>Waiting for more people to join…</p>
            ) : rankedSlots.length === 0 ? (
              <p style={{ fontSize: 17, color: '#aaa' }}>No mutual free slots this week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rankedSlots.map((slot, i) => {
                  const isSelected = selectedRange
                    ? slot.start >= selectedRange.start && slot.end <= selectedRange.end
                    : false;
                  return (
                    <button key={i} onClick={() => handleSlotClick(slot)}
                      style={{ padding: '12px 13px', backgroundColor: isSelected ? ROOM_ACCENT_SOFT : '#FBFCFE', border: `1px solid ${isSelected ? ROOM_ACCENT_BORDER : ROOM_BORDER}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <span style={{ fontSize: 14, color: ROOM_MUTED }}>{format(slot.start, 'EEE, MMM d')}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: ROOM_TEXT }}>{format(slot.start, 'h:mm a')} – {format(slot.end, 'h:mm a')}</span>
                      <span style={{ fontSize: 14, color: ROOM_ACCENT_DARK, fontWeight: 600 }}>{slot.count}/{participants.length} free</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual time entry */}
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${ROOM_BORDER}` }}>
            <p style={{ fontSize: 12, color: ROOM_MUTED, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, fontWeight: 700 }}>Set time manually</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="date" title="Date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${ROOM_BORDER}`, fontSize: 14, color: '#333', backgroundColor: ROOM_SURFACE, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="time" title="Start time" value={manualStart} onChange={e => setManualStart(e.target.value)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 10, border: `1px solid ${ROOM_BORDER}`, fontSize: 14, color: '#333', backgroundColor: ROOM_SURFACE }} />
                <span style={{ color: '#aaa', lineHeight: '34px' }}>–</span>
                <input type="time" title="End time" value={manualEnd} onChange={e => setManualEnd(e.target.value)}
                  style={{ flex: 1, padding: '9px 8px', borderRadius: 10, border: `1px solid ${ROOM_BORDER}`, fontSize: 14, color: '#333', backgroundColor: ROOM_SURFACE }} />
              </div>
              <button
                onClick={() => {
                  if (!manualDate || !manualStart || !manualEnd) return;
                  const [y, mo, d] = manualDate.split('-').map(Number);
                  const [sh, sm] = manualStart.split(':').map(Number);
                  const [eh, em] = manualEnd.split(':').map(Number);
                  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
                  const end = new Date(y, mo - 1, d, eh, em, 0, 0);
                  if (end > start) handleRangeChange({ start, end });
                }}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${ROOM_ACCENT_BORDER}`, backgroundColor: ROOM_SURFACE, color: ROOM_ACCENT_DARK, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Apply
              </button>
            </div>
          </div>

          {/* Propose selected slot */}
          {selectedRange && myIndex !== null && (
            <div style={{ margin: '0 20px 20px', padding: '14px', backgroundColor: ROOM_ACCENT_SOFT, border: `1px solid ${ROOM_ACCENT_BORDER}`, borderRadius: 16, boxShadow: ROOM_SHADOW }}>
              <p style={{ fontSize: 13, color: ROOM_MUTED, marginBottom: 8, fontWeight: 600 }}>{format(selectedRange.start, 'EEE, MMM d')}</p>
              {/* Editable start/end times */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <input type="time" title="Start time"
                  value={`${String(selectedRange.start.getHours()).padStart(2,'0')}:${String(selectedRange.start.getMinutes()).padStart(2,'0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const next = new Date(selectedRange.start); next.setHours(h, m, 0, 0);
                    if (next < selectedRange.end) handleRangeChange({ start: next, end: selectedRange.end });
                  }}
                  style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 10, border: `1px solid ${ROOM_ACCENT_BORDER}`, fontSize: 14, color: ROOM_TEXT, fontWeight: 700, backgroundColor: ROOM_SURFACE, boxSizing: 'border-box' }} />
                <span style={{ color: ROOM_ACCENT_DARK, fontWeight: 700, flexShrink: 0 }}>–</span>
                <input type="time" title="End time"
                  value={`${String(selectedRange.end.getHours()).padStart(2,'0')}:${String(selectedRange.end.getMinutes()).padStart(2,'0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const next = new Date(selectedRange.end); next.setHours(h, m, 0, 0);
                    if (next > selectedRange.start) handleRangeChange({ start: selectedRange.start, end: next });
                  }}
                  style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 10, border: `1px solid ${ROOM_ACCENT_BORDER}`, fontSize: 14, color: ROOM_TEXT, fontWeight: 700, backgroundColor: ROOM_SURFACE, boxSizing: 'border-box' }} />
              </div>
              {proposed ? (
                <p style={{ fontSize: 17, color: ROOM_ACCENT_DARK, fontWeight: 700 }}>✓ Proposal shared!</p>
              ) : (
                <button onClick={handlePropose} disabled={proposing}
                  style={{ width: '100%', backgroundColor: ROOM_ACCENT, color: '#fff', borderRadius: 12, padding: '12px', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: proposing ? 0.6 : 1, boxShadow: '0 12px 24px rgba(61,154,92,0.16)' }}>
                  {proposing ? 'Proposing...' : 'Suggest this time'}
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes skshimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} } * { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', padding: '16px' }}>
        <Sk h={48} r={8} style={{ marginBottom: 12 }} />
        <Sk h={400} r={12} />
        <style>{`@keyframes skshimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }`}</style>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
