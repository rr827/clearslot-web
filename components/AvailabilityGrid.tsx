'use client';

import { format, parseISO, isSameDay } from 'date-fns';
import { BusyBlock } from '@/lib/calendar';

const HOUR_HEIGHT = 56;
const HOURS_START = 6;
const HOURS_END = 23;
const TOTAL_HOURS = HOURS_END - HOURS_START;
const TIMELINE_HEIGHT = HOUR_HEIGHT * TOTAL_HOURS;

// Single calendar: free=light green, busy=light grey
// Two calendars:
//   both free      → green
//   only me free   → light yellow (they're busy)
//   only them free → light blue   (I'm busy)
//   both busy      → dark grey
const COLOR = {
  free:      '#ECFDF3',   // single cal: free
  busy:      '#dcdcd4',   // single cal: busy (light grey)
  bothFree:  '#22C55E',   // two cals: both free (logo-axis green)
  meFree:    '#fef3b0',   // two cals: only I'm free (light yellow)
  themFree:  '#bde0f5',   // two cals: only they're free (light blue)
  bothBusy:  '#b8b8b0',   // two cals: both busy (dark grey)
};

interface Props {
  dates: Date[];
  myBlocks: BusyBlock[];
  theirBlocks?: BusyBlock[];
}

type SegState = 'free' | 'busy' | 'bothFree' | 'meFree' | 'themFree' | 'bothBusy';

function computeSegments(
  date: Date,
  myBlocks: BusyBlock[],
  theirBlocks?: BusyBlock[]
): { top: number; height: number; state: SegState }[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const startMin = HOURS_START * 60;
  const endMin = HOURS_END * 60;

  const mine = myBlocks.filter(b => format(parseISO(b.start), 'yyyy-MM-dd') === dateStr);
  const theirs = (theirBlocks ?? []).filter(b => format(parseISO(b.start), 'yyyy-MM-dd') === dateStr);

  const toMin = (iso: string) => {
    const d = parseISO(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  // Collect all breakpoints
  const pts = new Set<number>([startMin, endMin]);
  for (const b of [...mine, ...theirs]) {
    const s = Math.max(toMin(b.start), startMin);
    const e = Math.min(toMin(b.end), endMin);
    if (s < endMin) pts.add(s);
    if (e > startMin) pts.add(e);
  }

  const sorted = Array.from(pts).sort((a, b) => a - b);
  const segments: { top: number; height: number; state: SegState }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i];
    const segEnd = sorted[i + 1];
    const mid = (segStart + segEnd) / 2;

    const myBusy = mine.some(b => toMin(b.start) <= mid && toMin(b.end) > mid);
    const theirBusy = theirs.some(b => toMin(b.start) <= mid && toMin(b.end) > mid);

    let state: SegState;
    if (theirBlocks) {
      if (!myBusy && !theirBusy) state = 'bothFree';
      else if (!myBusy && theirBusy) state = 'meFree';
      else if (myBusy && !theirBusy) state = 'themFree';
      else state = 'bothBusy';
    } else {
      state = myBusy ? 'busy' : 'free';
    }

    const top = ((segStart - startMin) / 60) * HOUR_HEIGHT;
    const height = Math.max(((segEnd - segStart) / 60) * HOUR_HEIGHT, 1);
    segments.push({ top, height, state });
  }

  return segments;
}

export default function AvailabilityGrid({ dates, myBlocks, theirBlocks }: Props) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOURS_START + i);

  return (
    <div style={{ display: 'flex', height: TIMELINE_HEIGHT, userSelect: 'none' }}>
      {/* Time labels */}
      <div style={{ width: 44, flexShrink: 0 }}>
        {hours.map(h => (
          <div key={h} style={{ height: HOUR_HEIGHT, paddingTop: 4 }}>
            <span style={{ fontSize: 11, color: '#999' }}>
              {format(new Date().setHours(h, 0, 0, 0), 'h a')}
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {dates.map((date, di) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isToday = isSameDay(date, new Date());
        const segments = computeSegments(date, myBlocks, theirBlocks);

        return (
          <div key={dateStr} style={{ flex: 1, position: 'relative', height: TIMELINE_HEIGHT, borderLeft: di > 0 ? '1px solid #e2e2dc' : 'none' }}>

            {/* Availability segments */}
            {segments.map((seg, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0,
                top: seg.top, height: seg.height,
                backgroundColor: COLOR[seg.state],
              }} />
            ))}

            {/* Hour grid lines on top */}
            {hours.map(h => (
              <div key={h} style={{
                position: 'absolute', left: 0, right: 0,
                top: (h - HOURS_START) * HOUR_HEIGHT,
                height: 1, backgroundColor: 'rgba(0,0,0,0.06)', pointerEvents: 'none',
              }} />
            ))}

            {/* Today outline */}
            {isToday && (
              <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(34,197,94,0.28)', pointerEvents: 'none' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
