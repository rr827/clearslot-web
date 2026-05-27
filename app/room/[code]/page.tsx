'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  format, addDays, startOfWeek, isSameDay, parseISO, addMinutes,
} from 'date-fns';
import { loadToken } from '@/lib/auth';
import { BusyBlock, createCalendarEvent } from '@/lib/calendar';
import { decodePayload, AlignedPayload, buildRoomLink } from '@/lib/payload';
import { getRoom, proposeTime, acceptProposal, RoomRow } from '@/lib/room';

// ── Types ──────────────────────────────────────────────────────────────────

type DailyView = 'swimlane' | 'grid' | 'arc';

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekDates(base: Date): Date[] {
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
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

  return slots.sort((a, b) => b.score - a.score).slice(0, 12);
}

type SelectedRange = { start: Date; end: Date } | null;

const PARTICIPANT_COLORS = ['#4a8000', '#1c3461', '#7a3800', '#5a0a5a', '#0a4a5a'];

// ── WeekView grid constants ─────────────────────────────────────────────────
const HOUR_HEIGHT = 56; // px per hour
const GRID_DAY_START = 6;
const GRID_DAY_END = 22;
const GRID_TOTAL_HOURS = GRID_DAY_END - GRID_DAY_START; // 16
const GRID_H = GRID_TOTAL_HOURS * HOUR_HEIGHT; // 896px

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
            <line x1={0} y1={y} x2="100%" y2={y} stroke="#bbb" strokeWidth={1} />
            {i < GRID_TOTAL_HOURS && (
              <>
                {/* 30-min — dashed */}
                <line x1={0} y1={y + HOUR_HEIGHT / 2} x2="100%" y2={y + HOUR_HEIGHT / 2}
                  stroke="#d4d4d4" strokeWidth={0.8} strokeDasharray="4 4" />
                {/* 15-min — light dashed */}
                <line x1={0} y1={y + HOUR_HEIGHT / 4} x2="100%" y2={y + HOUR_HEIGHT / 4}
                  stroke="#e4e4e4" strokeWidth={0.6} strokeDasharray="2 6" />
                <line x1={0} y1={y + (HOUR_HEIGHT * 3) / 4} x2="100%" y2={y + (HOUR_HEIGHT * 3) / 4}
                  stroke="#e4e4e4" strokeWidth={0.6} strokeDasharray="2 6" />
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
          <div key={date.toISOString()} style={{ textAlign: 'center', padding: '6px 0', fontSize: 16, fontWeight: 600, color: isSameDay(date, new Date()) ? '#4a8000' : '#888', letterSpacing: '0.05em' }}>
            <div>{format(date, 'EEE').toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isSameDay(date, new Date()) ? '#4a8000' : '#1a2e0a' }}>{format(date, 'd')}</div>
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
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 6, fontSize: 13, color: '#bbb', lineHeight: 1 }}>
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
                backgroundColor: '#daf5b0',
                position: 'relative',
                cursor: 'crosshair',
                userSelect: 'none',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <WeekGridLines />

              {/* Busy blocks — each participant stacks a translucent dark layer, darkening with more overlap */}
              {busyForDay.map((segs, pIdx) =>
                segs.map((seg, j) => {
                  const startClamped = Math.max(seg.startMin, GRID_DAY_START * 60);
                  const endClamped = Math.min(seg.endMin, GRID_DAY_END * 60);
                  if (endClamped <= startClamped) return null;
                  const top = toTopPct(startClamped);
                  const height = toTopPct(endClamped) - top;
                  return (
                    <div key={`${pIdx}-${j}`} style={{
                      position: 'absolute',
                      top: `${top}%`,
                      height: `${height}%`,
                      left: 0,
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.18)',
                      pointerEvents: 'none',
                    }} />
                  );
                })
              )}

              {/* Selection overlay */}
              {selOnThisDay && selEndPct > selStartPct && (
                <div style={{
                  position: 'absolute',
                  top: `${selStartPct}%`,
                  height: `${selEndPct - selStartPct}%`,
                  left: 0, right: 0,
                  backgroundColor: 'rgba(74,128,0,0.2)',
                  border: '2px solid #4a8000',
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
                  backgroundColor: 'rgba(74,128,0,0.25)',
                  border: '2px solid #4a8000',
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
  const DAY_START = 6 * 60, DAY_END = 22 * 60, DURATION = DAY_END - DAY_START;
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
                style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: '#d8f5b8', position: 'relative', cursor: 'crosshair', overflow: 'hidden', userSelect: 'none' }}>
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
                    backgroundColor: 'rgba(74,128,0,0.2)',
                    border: '2px solid #4a8000',
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
                    backgroundColor: 'rgba(74,128,0,0.25)',
                    border: '2px solid #4a8000',
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
          <div style={{ width: 92, fontSize: 16, color: '#4a8000', textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>Overlap</div>
          <div style={{ flex: 1, height: 20, borderRadius: 8, backgroundColor: '#f0f0ea', position: 'relative', overflow: 'hidden' }}>
            {overlapBands.map((band, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${toPercent(band.startMin)}%`,
                width: `${toPercent(band.endMin) - toPercent(band.startMin)}%`,
                top: 0, bottom: 0,
                backgroundColor: '#4a8000',
                borderRadius: 3,
              }} />
            ))}
          </div>
        </div>

        {/* Live drag time label */}
        {drag && dragEndMin > dragStartMin && (
          <div style={{ marginLeft: 100, fontSize: 15, color: '#4a8000', fontWeight: 500 }}>
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
        <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 16, fontWeight: 600, color: isSameDay(date, new Date()) ? '#4a8000' : '#888', letterSpacing: '0.05em' }}>
          <div>{format(date, 'EEE').toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: isSameDay(date, new Date()) ? '#4a8000' : '#1a2e0a' }}>{format(date, 'd')}</div>
        </div>
      </div>

      {/* Grid body */}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Time labels */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: GRID_H }}>
          {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
            const h = GRID_DAY_START + i;
            return (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 6, fontSize: 13, color: '#bbb', lineHeight: 1 }}>
                {i === 0 ? '' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            );
          })}
        </div>

        {/* Day column */}
        <div
          onMouseDown={handleMouseDown}
          style={{ flex: 1, height: GRID_H, backgroundColor: '#daf5b0', position: 'relative', cursor: 'crosshair', userSelect: 'none', borderRadius: 4, overflow: 'hidden' }}
        >
          <WeekGridLines />

          {busyForDay.map((segs, pIdx) =>
            segs.map((seg, j) => {
              const startClamped = Math.max(seg.startMin, GRID_DAY_START * 60);
              const endClamped = Math.min(seg.endMin, GRID_DAY_END * 60);
              if (endClamped <= startClamped) return null;
              const top = toTopPct(startClamped);
              const height = toTopPct(endClamped) - top;
              const colWidth = numParticipants > 0 ? 100 / numParticipants : 100;
              return (
                <div key={`${pIdx}-${j}`} style={{
                  position: 'absolute', top: `${top}%`, height: `${height}%`,
                  left: `${pIdx * colWidth}%`, width: `${colWidth}%`,
                  backgroundColor: PARTICIPANT_COLORS[pIdx % PARTICIPANT_COLORS.length],
                  opacity: 0.5, pointerEvents: 'none',
                }} />
              );
            })
          )}

          {selOnThisDay && selEndPct > selStartPct && (
            <div style={{
              position: 'absolute', top: `${selStartPct}%`, height: `${selEndPct - selStartPct}%`,
              left: 0, right: 0, backgroundColor: 'rgba(74,128,0,0.2)',
              border: '2px solid #4a8000', borderRadius: 3, pointerEvents: 'none',
            }} />
          )}

          {drag && dragEndPct > dragStartPct && (
            <div style={{
              position: 'absolute', top: `${dragStartPct}%`, height: `${dragEndPct - dragStartPct}%`,
              left: 0, right: 0, backgroundColor: 'rgba(74,128,0,0.25)',
              border: '2px solid #4a8000', borderRadius: 3, pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ArcClockView({
  date, participants, allBlocks,
}: {
  date: Date;
  participants: AlignedPayload[];
  allBlocks: BusyBlock[][];
}) {
  const svgSize = 300;
  const cx = svgSize / 2, cy = svgSize / 2;
  const ringGap = 10;
  const outerR = 130;
  const innerR = outerR - participants.length * ringGap - ringGap;
  const overlapR = innerR - 4;

  const hourToAngle = (hour: number) => ((hour - 6) / 24) * 360 - 90; // 6am at top

  function arcPath(r: number, startAngle: number, endAngle: number): string {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width={svgSize} height={svgSize} style={{ cursor: 'default' }}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={outerR + 6} fill="#f0f0ea" />

        {/* Hour ticks */}
        {[6, 9, 12, 15, 18, 21].map(h => {
          const ang = (hourToAngle(h) * Math.PI) / 180;
          const tx = cx + (outerR + 16) * Math.cos(ang);
          const ty = cy + (outerR + 16) * Math.sin(ang);
          return (
            <text key={h} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#aaa">
              {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </text>
          );
        })}

        {/* Participant rings (outermost = participant 0) */}
        {participants.map((p, i) => {
          const r = outerR - i * ringGap;
          const busySegs = getDayBusy(date, p.blocks);
          const sleepFrom = p.sleep ? parseInt(p.sleep.from) : null;
          const sleepTo = p.sleep ? parseInt(p.sleep.to) : null;

          return (
            <g key={i}>
              {/* Base arc (free) */}
              <path d={arcPath(r, hourToAngle(6), hourToAngle(22))} fill="none"
                stroke="#d4edbb" strokeWidth={ringGap - 2} strokeLinecap="butt" />
              {/* Busy segments */}
              {busySegs.map((seg, j) => {
                const startH = seg.startMin / 60;
                const endH = seg.endMin / 60;
                if (endH < 6 || startH > 22) return null;
                return (
                  <path key={j}
                    d={arcPath(r, hourToAngle(Math.max(startH, 6)), hourToAngle(Math.min(endH, 22)))}
                    fill="none"
                    stroke={PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]}
                    strokeWidth={ringGap - 2}
                    strokeLinecap="butt"
                    opacity={0.6}
                  />
                );
              })}
              {/* Sleep dim overlay */}
              {sleepFrom !== null && sleepTo !== null && (
                <path
                  d={arcPath(r, hourToAngle(Math.max(sleepFrom - 24 < 6 ? sleepFrom : sleepFrom, 6)), hourToAngle(Math.min(sleepTo, 22)))}
                  fill="none" stroke="#aaa" strokeWidth={ringGap - 2} strokeLinecap="butt" opacity={0.4}
                />
              )}
            </g>
          );
        })}

        {/* Overlap wedges from center */}
        {Array.from({ length: 16 * 4 }).map((_, qi) => {
          const startH = 6 + qi * 0.25;
          const endH = startH + 0.25;
          const slotStart = new Date(date); slotStart.setHours(Math.floor(startH), (startH % 1) * 60, 0, 0);
          const slotEnd = addMinutes(slotStart, 15);
          const count = overlapCount(slotStart, slotEnd, allBlocks);
          if (count === 0) return null;
          const frac = count / Math.max(participants.length, 1);
          const r = overlapR * frac * 0.7 + 10;
          const alpha = 0.2 + frac * 0.6;
          return (
            <path key={qi}
              d={arcPath(r / 2, hourToAngle(startH), hourToAngle(endH))}
              fill="none"
              stroke={`rgba(0,160,140,${alpha.toFixed(2)})`}
              strokeWidth={r}
              strokeLinecap="butt"
            />
          );
        })}

        {/* Center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={15} fill="#4a8000" fontWeight={600}>
          {participants.length > 0 ? 'Group overview' : ''}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={13} fill="#888">
          {format(date, 'EEE, MMM d')}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 16, color: '#888', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: '#d4edbb', marginRight: 4 }} />Free</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(0,160,140,0.6)', marginRight: 4 }} />Overlap</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: '#aaa', marginRight: 4 }} />Busy/Sleep</span>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

function RoomContent() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [addedToCalIdx, setAddedToCalIdx] = useState<number | null>(null);
  const [showAppBanner, setShowAppBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    if (isMobile) setShowAppBanner(true);
  }, []);

  // Manual time entry
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  const weekDates = getWeekDates(weekBase);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRoom(code);
        if (!data) { setError('Room not found or expired.'); setLoading(false); return; }
        setRoom(data);

        const decoded = data.participants.map(p => decodePayload(p));
        setParticipants(decoded);
        setAllBlocks(decoded.map(p => p.blocks));

        const idx = localStorage.getItem(`room_${code}`);
        setMyIndex(idx !== null ? parseInt(idx) : null);

        const slots = rankSlots(decoded.map(p => p.blocks), decoded.map(p => p.preference), weekDates);
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
    await navigator.clipboard.writeText(buildRoomLink(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePropose = async () => {
    if (!selectedRange || myIndex === null) return;
    setProposing(true);
    try {
      await proposeTime(code, myIndex, selectedRange.start.toISOString(), selectedRange.end.toISOString());
      setProposed(true);
    } catch {
      alert('Could not save proposal. Try again.');
    } finally {
      setProposing(false);
    }
  };

  const handleAccept = async (proposalIndex: number, startTime: string, endTime: string) => {
    setAcceptingIdx(proposalIndex);
    try {
      await acceptProposal(code, proposalIndex);
      // Reload room to show updated status
      const data = await getRoom(code);
      if (data) setRoom(data);
      // Add to this user's calendar if they have a token
      const token = loadToken();
      if (token) {
        await createCalendarEvent(token, 'Meeting', new Date(startTime), new Date(endTime));
      }
    } catch {
      alert('Could not accept proposal. Try again.');
    } finally {
      setAcceptingIdx(null);
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

  // Join buttons are shown based on room membership (myIndex), not calendar connection.
  // This prevents room creators from seeing join buttons after a browser restart.

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(74,128,0,0.3)', borderTopColor: '#4a8000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 22, color: '#555' }}>{error}</p>
      <button onClick={() => router.replace('/connect')} style={{ fontSize: 19, color: '#4a8000', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Start a new room</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f0', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* Mobile app download banner */}
      {showAppBanner && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#1a2e0a', padding: '16px 20px 32px', boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}>
          <button
            onClick={() => setShowAppBanner(false)}
            style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'rgba(200,249,122,0.5)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
            aria-label="Dismiss"
          >×</button>
          <p style={{ color: '#c8f97a', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>Get the app</p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, margin: '0 0 14px', lineHeight: 1.4 }}>
            Open this room in the ClearSlot app for a better experience.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`clearslot://room?code=${code}`}
              style={{ flex: 1, backgroundColor: '#c8f97a', color: '#1a2e0a', fontSize: 15, fontWeight: 700, textAlign: 'center', padding: '11px 0', borderRadius: 10, textDecoration: 'none' }}
            >
              Open in App
            </a>
            <a
              href="https://apps.apple.com/app/idYOUR_APP_ID"
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, backgroundColor: 'rgba(200,249,122,0.12)', color: '#c8f97a', fontSize: 15, fontWeight: 600, textAlign: 'center', padding: '11px 0', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(200,249,122,0.25)' }}
            >
              Download ↗
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '0 28px', height: 54, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.06em', color: '#1a1a18' }}>clearslot</span>

        {/* Room code badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 10, padding: '5px 12px' }}>
          <span style={{ fontSize: 16, color: '#888' }}>Room</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.12em', color: '#1a2e0a' }}>{code}</span>
        </div>

        {/* Participant count */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {participants.map((_, i) => (
            <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', fontWeight: 700, border: '2px solid #f5f5f0', marginLeft: i > 0 ? -8 : 0 }}>
              {i + 1}
            </div>
          ))}
          <span style={{ fontSize: 17, color: '#888', marginLeft: 8 }}>{participants.length} {participants.length === 1 ? 'person' : 'people'}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, backgroundColor: '#fff', border: '1px solid #1a1a1a', borderRadius: 9, padding: 3 }}>
          {(['week', 'day'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: '5px 14px', borderRadius: 6, fontSize: 17, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: viewMode === m ? '#d8d8d2' : 'transparent', color: viewMode === m ? '#0a0a0a' : '#555' }}>
              {m === 'week' ? 'Week' : 'Day'}
            </button>
          ))}
        </div>

        {viewMode === 'day' && (
          <div style={{ display: 'flex', gap: 2, backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 9, padding: 3 }}>
            {(['swimlane', 'grid', 'arc'] as DailyView[]).map(v => (
              <button key={v} onClick={() => setDailyView(v)}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: dailyView === v ? '#d8d8d2' : 'transparent', color: dailyView === v ? '#0a0a0a' : '#555', textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date nav */}
      <div style={{ borderBottom: '1px solid #e2e2dc', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {viewMode === 'week' ? (
          <>
            <button onClick={() => setWeekBase(d => addDays(d, -7))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#fff', cursor: 'pointer', fontSize: 18 }}>←</button>
            <span style={{ fontSize: 18, color: '#555', minWidth: 180 }}>{format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}</span>
            <button onClick={() => setWeekBase(d => addDays(d, 7))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#fff', cursor: 'pointer', fontSize: 18 }}>→</button>
            <button onClick={() => setWeekBase(new Date())} style={{ fontSize: 17, color: '#555', background: 'none', border: '1px solid #1a1a1a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Today</button>
          </>
        ) : (
          <>
            <button onClick={() => setSelectedDate(d => addDays(d, -1))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#fff', cursor: 'pointer', fontSize: 18 }}>←</button>
            <span style={{ fontSize: 18, color: '#555', minWidth: 160 }}>{format(selectedDate, 'EEEE, MMMM d')}</span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #1a1a1a', background: '#fff', cursor: 'pointer', fontSize: 18 }}>→</button>
            <button onClick={() => setSelectedDate(new Date())} style={{ fontSize: 17, color: '#555', background: 'none', border: '1px solid #1a1a1a', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Today</button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Main view area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '28px 32px 48px' }}>
          {participants.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#888', fontSize: 19 }}>
              <p style={{ marginBottom: 8 }}>No one has connected yet.</p>
              {myIndex === null && <button onClick={handleJoin} style={{ fontSize: 19, color: '#4a8000', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Be the first to join →</button>}
            </div>
          ) : viewMode === 'week' ? (
            <WeekView weekDates={weekDates} allBlocks={allBlocks} selectedRange={selectedRange} onRangeChange={handleRangeChange} />
          ) : dailyView === 'swimlane' ? (
            <SwimLaneView date={selectedDate} participants={participants} allBlocks={allBlocks} onRangeChange={handleRangeChange} selectedRange={selectedRange} />
          ) : dailyView === 'grid' ? (
            <GridDayView date={selectedDate} participants={participants} allBlocks={allBlocks} onRangeChange={handleRangeChange} selectedRange={selectedRange} />
          ) : (
            <ArcClockView date={selectedDate} participants={participants} allBlocks={allBlocks} />
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: 288, borderLeft: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

          {/* Share / Join */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e2dc', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleCopyLink}
              style={{ width: '100%', backgroundColor: '#4a8000', color: '#fff', borderRadius: 11, padding: '12px', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              {copied ? '✓ Link copied!' : 'Copy invite link'}
            </button>
            {myIndex === null && (
              <button onClick={handleJoin}
                style={{ width: '100%', backgroundColor: '#fff', color: '#4a8000', borderRadius: 11, padding: '12px', fontSize: 18, fontWeight: 600, border: '1.5px solid #4a8000', cursor: 'pointer' }}>
                Join this room
              </button>
            )}
          </div>

          {/* Proposals list */}
          {room?.proposals && room.proposals.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e2dc' }}>
              <p style={{ fontSize: 15, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Proposals</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {room.proposals.map((prop, i) => {
                  const isAccepted = prop.status === 'accepted';
                  const canAccept = prop.status === 'pending' && (myIndex === null || prop.proposer_index !== myIndex);
                  const hasToken = !!loadToken();
                  return (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 9, backgroundColor: isAccepted ? 'rgba(74,128,0,0.06)' : '#fff', border: `1px solid ${isAccepted ? 'rgba(74,128,0,0.2)' : '#e0e0d8'}` }}>
                      <p style={{ fontSize: 14, color: '#888', marginBottom: 2 }}>Person {prop.proposer_index + 1} suggests</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#1a2e0a', marginBottom: 6 }}>
                        {format(parseISO(prop.start_time), 'EEE MMM d, h:mm a')} – {format(parseISO(prop.end_time), 'h:mm a')}
                      </p>
                      {isAccepted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 14, color: '#4a8000', fontWeight: 600 }}>✓ Accepted</span>
                          {addedToCalIdx === i ? (
                            <span style={{ fontSize: 14, color: '#4a8000', fontWeight: 500 }}>✓ Added to Google Calendar</span>
                          ) : hasToken ? (
                            <button
                              onClick={async () => {
                                const token = loadToken();
                                if (!token) { alert('Your session expired. Reconnect your calendar to add events.'); return; }
                                try {
                                  await createCalendarEvent(token, 'Meeting', new Date(prop.start_time), new Date(prop.end_time));
                                  setAddedToCalIdx(i);
                                } catch {
                                  alert('Could not add to calendar. Your session may have expired — try reconnecting.');
                                }
                              }}
                              style={{ fontSize: 14, color: '#4a8000', background: 'none', border: '1px solid #4a8000', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontWeight: 500 }}>
                              Add to Google Calendar
                            </button>
                          ) : (
                            <a href={`/connect?room=${code}`} style={{ fontSize: 14, color: '#4a8000', fontWeight: 500, textDecoration: 'underline' }}>
                              Connect Google Calendar to add this event
                            </a>
                          )}
                        </div>
                      ) : canAccept ? (
                        <button
                          onClick={() => handleAccept(i, prop.start_time, prop.end_time)}
                          disabled={acceptingIdx === i}
                          style={{ width: '100%', backgroundColor: '#4a8000', color: '#fff', borderRadius: 7, padding: '7px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: acceptingIdx === i ? 0.6 : 1 }}>
                          {acceptingIdx === i ? 'Accepting…' : 'Accept & add to calendar'}
                        </button>
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
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: 15, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
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
                      style={{ padding: '9px 12px', backgroundColor: isSelected ? 'rgba(74,128,0,0.08)' : '#fff', border: `1px solid ${isSelected ? '#4a8000' : '#e2e2dc'}`, borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <span style={{ fontSize: 16, color: '#888' }}>{format(slot.start, 'EEE, MMM d')}</span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#1a2e0a' }}>{format(slot.start, 'h:mm a')} – {format(slot.end, 'h:mm a')}</span>
                      <span style={{ fontSize: 15, color: '#4a8000' }}>{slot.count}/{participants.length} free</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual time entry */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e2dc' }}>
            <p style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Set time manually</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="date" title="Date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #d8d8d0', fontSize: 15, color: '#333', backgroundColor: '#fff', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="time" title="Start time" value={manualStart} onChange={e => setManualStart(e.target.value)}
                  style={{ flex: 1, padding: '7px 8px', borderRadius: 8, border: '1px solid #d8d8d0', fontSize: 15, color: '#333', backgroundColor: '#fff' }} />
                <span style={{ color: '#aaa', lineHeight: '34px' }}>–</span>
                <input type="time" title="End time" value={manualEnd} onChange={e => setManualEnd(e.target.value)}
                  style={{ flex: 1, padding: '7px 8px', borderRadius: 8, border: '1px solid #d8d8d0', fontSize: 15, color: '#333', backgroundColor: '#fff' }} />
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
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid #4a8000', backgroundColor: 'transparent', color: '#4a8000', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Apply
              </button>
            </div>
          </div>

          {/* Propose selected slot */}
          {selectedRange && myIndex !== null && (
            <div style={{ margin: '0 20px 20px', padding: '12px', backgroundColor: 'rgba(74,128,0,0.06)', border: '1px solid rgba(74,128,0,0.2)', borderRadius: 11 }}>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 6 }}>{format(selectedRange.start, 'EEE, MMM d')}</p>
              {/* Editable start/end times */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <input type="time" title="Start time"
                  value={`${String(selectedRange.start.getHours()).padStart(2,'0')}:${String(selectedRange.start.getMinutes()).padStart(2,'0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const next = new Date(selectedRange.start); next.setHours(h, m, 0, 0);
                    if (next < selectedRange.end) handleRangeChange({ start: next, end: selectedRange.end });
                  }}
                  style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 7, border: '1.5px solid #4a8000', fontSize: 15, color: '#1a2e0a', fontWeight: 600, backgroundColor: '#fff', boxSizing: 'border-box' }} />
                <span style={{ color: '#4a8000', fontWeight: 600, flexShrink: 0 }}>–</span>
                <input type="time" title="End time"
                  value={`${String(selectedRange.end.getHours()).padStart(2,'0')}:${String(selectedRange.end.getMinutes()).padStart(2,'0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const next = new Date(selectedRange.end); next.setHours(h, m, 0, 0);
                    if (next > selectedRange.start) handleRangeChange({ start: selectedRange.start, end: next });
                  }}
                  style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 7, border: '1.5px solid #4a8000', fontSize: 15, color: '#1a2e0a', fontWeight: 600, backgroundColor: '#fff', boxSizing: 'border-box' }} />
              </div>
              {proposed ? (
                <p style={{ fontSize: 18, color: '#4a8000', fontWeight: 600 }}>✓ Proposal shared!</p>
              ) : (
                <button onClick={handlePropose} disabled={proposing}
                  style={{ width: '100%', backgroundColor: '#4a8000', color: '#fff', borderRadius: 9, padding: '10px', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: proposing ? 0.6 : 1 }}>
                  {proposing ? 'Proposing...' : 'Suggest this time'}
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

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '2px solid rgba(74,128,0,0.3)', borderTopColor: '#4a8000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
