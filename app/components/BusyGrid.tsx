'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { BusyBlock } from '@/lib/calendar';

// Grid constants — mirror room/[code]/page.tsx for visual consistency
const HOUR_HEIGHT = 56;
const GRID_DAY_START = 6;
const GRID_DAY_END = 22;
const GRID_TOTAL_HOURS = GRID_DAY_END - GRID_DAY_START;
const GRID_H = GRID_TOTAL_HOURS * HOUR_HEIGHT;
const GRID_BORDER = '#E8EBF0';
const BUSY_COLOR = 'rgba(59,130,246,0.75)';
const BUSY_DRAG_COLOR = 'rgba(59,130,246,0.35)';

function snapTo5(min: number): number {
  return Math.round(min / 5) * 5;
}

function yToMin(y: number, height: number): number {
  return Math.max(
    GRID_DAY_START * 60,
    Math.min(GRID_DAY_END * 60, snapTo5(GRID_DAY_START * 60 + (y / height) * GRID_TOTAL_HOURS * 60))
  );
}

function toTopPct(min: number): number {
  return ((min - GRID_DAY_START * 60) / (GRID_TOTAL_HOURS * 60)) * 100;
}

function WeekGridLines() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: GRID_H, pointerEvents: 'none' }}>
      {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
        const y = i * HOUR_HEIGHT;
        return (
          <g key={i}>
            <line x1={0} y1={y} x2="100%" y2={y} stroke={GRID_BORDER} strokeWidth={1} />
            {i < GRID_TOTAL_HOURS && (
              <>
                <line x1={0} y1={y + HOUR_HEIGHT / 2} x2="100%" y2={y + HOUR_HEIGHT / 2}
                  stroke="#D9DEE7" strokeWidth={0.8} strokeDasharray="4 4" />
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

// ── Helpers ─────────────────────────────────────────────────────────────────

type LocalBlock = { startMin: number; endMin: number };

function dayIsoOf(b: BusyBlock): string {
  return format(new Date(b.start), 'yyyy-MM-dd');
}

function getDayLocalBlocks(blocks: BusyBlock[], dayIso: string): LocalBlock[] {
  return blocks
    .filter(b => dayIsoOf(b) === dayIso)
    .map(b => {
      const s = new Date(b.start);
      const e = new Date(b.end);
      let endMin = e.getHours() * 60 + e.getMinutes();
      if (endMin === 0 && e.getDate() !== s.getDate()) endMin = GRID_DAY_END * 60;
      return {
        startMin: Math.max(GRID_DAY_START * 60, s.getHours() * 60 + s.getMinutes()),
        endMin: Math.min(GRID_DAY_END * 60, endMin),
      };
    })
    .filter(b => b.endMin > b.startMin)
    .sort((a, b) => a.startMin - b.startMin);
}

function hitTest(localBlocks: LocalBlock[], min: number): number {
  return localBlocks.findIndex(b => min >= b.startMin && min < b.endMin);
}

function mergeBlock(existing: LocalBlock[], sMin: number, eMin: number): LocalBlock[] {
  const all = [...existing, { startMin: sMin, endMin: eMin }].sort((a, b) => a.startMin - b.startMin);
  const merged: LocalBlock[] = [];
  for (const blk of all) {
    if (merged.length && blk.startMin <= merged[merged.length - 1].endMin) {
      merged[merged.length - 1].endMin = Math.max(merged[merged.length - 1].endMin, blk.endMin);
    } else {
      merged.push({ ...blk });
    }
  }
  return merged;
}

function localToISO(localBlocks: LocalBlock[], dayIso: string): BusyBlock[] {
  return localBlocks.map(b => {
    const base = new Date(dayIso + 'T00:00:00');
    const start = new Date(base);
    start.setHours(Math.floor(b.startMin / 60), b.startMin % 60, 0, 0);
    const end = new Date(base);
    end.setHours(Math.floor(b.endMin / 60), b.endMin % 60, 0, 0);
    return { start: start.toISOString(), end: end.toISOString() };
  });
}

function isFullDay(blocks: BusyBlock[], dayIso: string): boolean {
  return blocks.some(b => {
    if (dayIsoOf(b) !== dayIso) return false;
    const dur = new Date(b.end).getTime() - new Date(b.start).getTime();
    return dur >= 23 * 60 * 60 * 1000;
  });
}

// ── BusyGrid ─────────────────────────────────────────────────────────────────

export default function BusyGrid({
  weekDates,
  value,
  onChange,
  disabledDates = [],
  onPrevWeek,
  onNextWeek,
  weekLabel,
}: {
  weekDates: Date[];
  value: BusyBlock[];
  onChange: (blocks: BusyBlock[]) => void;
  disabledDates?: string[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  weekLabel?: string;
}) {
  const [drag, setDrag] = useState<{ day: string; startMin: number; endMin: number } | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const dragStateRef = useRef<typeof drag>(null);
  const dragColRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => { onChangeRef.current = onChange; valueRef.current = value; });

  // Window-level listeners — identical pattern to WeekView in room/[code]/page.tsx
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStateRef.current || !dragColRef.current) return;
      const rect = dragColRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const updated = { ...dragStateRef.current, endMin: yToMin(y, rect.height) };
      dragStateRef.current = updated;
      setDrag({ ...updated });
    };
    const onUp = () => {
      const d = dragStateRef.current;
      if (!d) { setDrag(null); return; }
      const sMin = Math.min(d.startMin, d.endMin);
      const eMin = Math.max(d.startMin, d.endMin);
      if (eMin - sMin >= 5) {
        const dayBlocks = getDayLocalBlocks(valueRef.current, d.day);
        const merged = mergeBlock(dayBlocks, sMin, eMin);
        const newBlocks = [
          ...valueRef.current.filter(b => dayIsoOf(b) !== d.day),
          ...localToISO(merged, d.day),
        ];
        onChangeRef.current(newBlocks);
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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, dayIso: string) => {
    e.preventDefault();
    const colEl = e.currentTarget;
    const rect = colEl.getBoundingClientRect();
    const min = yToMin(Math.max(0, Math.min(rect.height, e.clientY - rect.top)), rect.height);
    const dayLocalBlocks = getDayLocalBlocks(valueRef.current, dayIso);
    const hitIdx = hitTest(dayLocalBlocks, min);
    if (hitIdx >= 0) {
      // Click on existing block → remove just that block, don't start drag
      const hit = dayLocalBlocks[hitIdx];
      const newBlocks = valueRef.current.filter(b =>
        !(dayIsoOf(b) === dayIso &&
          new Date(b.start).getHours() * 60 + new Date(b.start).getMinutes() === hit.startMin)
      );
      onChangeRef.current(newBlocks);
      return;
    }
    const nd = { day: dayIso, startMin: min, endMin: min };
    dragStateRef.current = nd;
    dragColRef.current = colEl;
    setDrag(nd);
  };

  const handleHeaderClick = (dayIso: string) => {
    if (isFullDay(valueRef.current, dayIso)) {
      onChangeRef.current(valueRef.current.filter(b => dayIsoOf(b) !== dayIso));
    } else {
      const base = new Date(dayIso + 'T00:00:00');
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      onChangeRef.current([
        ...valueRef.current.filter(b => dayIsoOf(b) !== dayIso),
        { start: base.toISOString(), end: next.toISOString() },
      ]);
    }
  };

  const disabledSet = new Set(disabledDates);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Helper text — always visible, explains both interactions */}
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 10px 44px' }}>
        Drag to mark busy hours.{' '}
        <strong style={{ fontWeight: 600, color: '#374151' }}>
          Click a date header to block the whole day.
        </strong>
      </p>

      {/* Week navigation */}
      {(onPrevWeek !== undefined || onNextWeek !== undefined || weekLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingLeft: 44 }}>
          <button
            onClick={onPrevWeek}
            disabled={!onPrevWeek}
            style={{
              width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: 8,
              background: '#fff', cursor: onPrevWeek ? 'pointer' : 'default',
              color: onPrevWeek ? '#374151' : '#D1D5DB', fontSize: 17,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', flex: 1 }}>{weekLabel}</span>
          <button
            onClick={onNextWeek}
            disabled={!onNextWeek}
            style={{
              width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: 8,
              background: '#fff', cursor: onNextWeek ? 'pointer' : 'default',
              color: onNextWeek ? '#374151' : '#D1D5DB', fontSize: 17,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >›</button>
        </div>
      )}

      {/* Day header row — each date is a button for all-day toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        <div />
        {weekDates.map(date => {
          const iso = format(date, 'yyyy-MM-dd');
          const full = isFullDay(value, iso);
          const disabled = disabledSet.has(iso);
          return (
            <button
              key={iso}
              onClick={() => { if (!disabled) handleHeaderClick(iso); }}
              onMouseEnter={() => { if (!disabled) setHoverDay(iso); }}
              onMouseLeave={() => setHoverDay(null)}
              style={{
                textAlign: 'center', padding: '6px 4px', border: 'none', borderRadius: 8,
                cursor: disabled ? 'default' : 'pointer',
                background: full
                  ? 'rgba(59,130,246,0.15)'
                  : hoverDay === iso
                  ? 'rgba(59,130,246,0.07)'
                  : 'transparent',
                opacity: disabled ? 0.3 : 1,
                transition: 'background 0.12s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
                {format(date, 'EEE').toUpperCase()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: full ? '#3B82F6' : '#374151' }}>
                {format(date, 'd')}
              </div>
              {full && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: '#3B82F6',
                  background: 'rgba(59,130,246,0.12)', borderRadius: 4,
                  padding: '1px 5px', display: 'inline-block', letterSpacing: '0.04em',
                }}>
                  ALL DAY
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid body */}
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Time labels */}
        <div style={{ width: 44, flexShrink: 0, position: 'relative', height: GRID_H }}>
          {Array.from({ length: GRID_TOTAL_HOURS + 1 }, (_, i) => {
            const h = GRID_DAY_START + i;
            return (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 6, fontSize: 12, color: '#9CA3AF', lineHeight: 1 }}>
                {i === 0 ? '' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            );
          })}
        </div>

        {/* Day columns */}
        {weekDates.map(date => {
          const iso = format(date, 'yyyy-MM-dd');
          const disabled = disabledSet.has(iso);
          const localBlocks = getDayLocalBlocks(value, iso);
          const dragOnThisDay = drag?.day === iso;

          return (
            <div
              key={iso}
              onMouseDown={disabled ? undefined : e => handleMouseDown(e, iso)}
              style={{
                flex: 1, height: GRID_H, position: 'relative',
                backgroundColor: disabled ? '#F3F4F6' : '#DCFCE7',
                cursor: disabled ? 'default' : 'crosshair',
                userSelect: 'none', borderRadius: 4, overflow: 'hidden',
              }}
            >
              <WeekGridLines />

              {/* Committed busy blocks */}
              {localBlocks.map((b, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 0, width: '100%', borderRadius: 3,
                  pointerEvents: 'none',
                  top: `${toTopPct(b.startMin)}%`,
                  height: `${toTopPct(b.endMin) - toTopPct(b.startMin)}%`,
                  backgroundColor: BUSY_COLOR,
                }} />
              ))}

              {/* Live drag preview */}
              {dragOnThisDay && drag && Math.abs(drag.endMin - drag.startMin) >= 5 && (() => {
                const s = Math.min(drag.startMin, drag.endMin);
                const e2 = Math.max(drag.startMin, drag.endMin);
                return (
                  <div style={{
                    position: 'absolute', left: 0, width: '100%', borderRadius: 3,
                    pointerEvents: 'none',
                    top: `${toTopPct(s)}%`,
                    height: `${toTopPct(e2) - toTopPct(s)}%`,
                    backgroundColor: BUSY_DRAG_COLOR,
                  }} />
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
