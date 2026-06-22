'use client';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DATES = [8, 9, 10, 11, 12, 13, 14];
const TODAY = 3; // THU
const ROOM_CODE = 'K7QPMX';
const ACCENT = '#3D9A5C';
const ACCENT_SOFT = '#EEF7F0';
const BORDER = '#E8EBF0';
const TEXT_MUTED = '#667085';

// Matches PARTICIPANT_COLORS / PARTICIPANT_BG_COLORS in app/room/[code]/page.tsx
const PARTICIPANT_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#A855F7'];
const PARTICIPANT_BG_COLORS = [
  'rgba(59,130,246,0.45)',  // blue
  'rgba(239,68,68,0.45)',   // red
  'rgba(245,158,11,0.45)',  // amber
  'rgba(168,85,247,0.45)',  // purple
];
const OVERLAP_COLOR = 'rgba(90,90,90,0.55)';

const PARTICIPANTS = [
  { name: 'Alex' },
  { name: 'Sam' },
  { name: 'Taylor' },
  { name: 'Jordan' },
];

const HOURS = ['9am', '10am', '11am', '12pm', '1pm', '2pm'];
const HOUR_HEIGHT = 42; // px — 5 hours visible (9am–2pm)
const GRID_H = HOUR_HEIGHT * (HOURS.length - 1);

// d = dayIndex, t = top%, h = height%, p = participant index, overlap = render as gray overlap
const BLOCKS = [
  { d: 0, t: 10, h: 22, p: 0 },              // MON Alex
  { d: 0, t: 42, h: 18, p: 1 },              // MON Sam
  { d: 1, t: 20, h: 28, p: 1 },              // TUE Sam
  { d: 1, t: 68, h: 18, p: 2 },              // TUE Taylor
  { d: 2, t: 2,  h: 22, p: 0 },              // WED Alex
  { d: 2, t: 40, h: 20, p: 2 },              // WED Taylor
  { d: 2, t: 72, h: 24, p: 3 },              // WED Jordan
  { d: 3, t: 32, h: 20, p: 1 },              // THU Sam
  { d: 4, t: 20, h: 22, p: 0 },              // FRI Alex
  { d: 4, t: 32, h: 10, p: 0, overlap: true }, // FRI Alex + Taylor overlap
  { d: 4, t: 78, h: 18, p: 2 },              // FRI Taylor
  { d: 5, t: 10, h: 18, p: 3 },              // SAT Jordan
];

// Selection on THU grows from 9am (0%) to ~noon (56%)
const SEL_TOP = 0;
const SEL_MAX = 56;

const css = `
@keyframes cs-sel {
  0%, 10%   { height: 0%;          opacity: 0; }
  16%        { height: 0%;          opacity: 1; }
  54%        { height: ${SEL_MAX}%; opacity: 1; }
  68%, 80%   { height: ${SEL_MAX}%; opacity: 1; }
  90%, 100%  { height: ${SEL_MAX}%; opacity: 0; }
}
@keyframes cs-dot {
  0%, 10%   { top: ${SEL_TOP}%;             opacity: 0; }
  14%        { top: ${SEL_TOP}%;             opacity: 1; }
  54%        { top: ${SEL_TOP + SEL_MAX}%;   opacity: 1; }
  68%        { top: ${SEL_TOP + SEL_MAX}%;   opacity: 1; }
  75%        { top: ${SEL_TOP + SEL_MAX}%;   opacity: 0; }
  100%       { top: ${SEL_TOP + SEL_MAX}%;   opacity: 0; }
}
`;

// Mirrors WeekGridLines in app/room/[code]/page.tsx, scaled to the demo's grid height
function GridLines() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: GRID_H, pointerEvents: 'none' }}>
      {Array.from({ length: HOURS.length }, (_, i) => {
        const y = i * HOUR_HEIGHT;
        return (
          <g key={i}>
            <line x1={0} y1={y} x2="100%" y2={y} stroke={BORDER} strokeWidth={1} />
            {i < HOURS.length - 1 && (
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

export default function WeekDemo() {
  return (
    <>
      <style>{css}</style>
      <div style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 22,
        padding: '22px 20px 18px',
        boxShadow: '0 18px 46px rgba(15, 23, 42, 0.07), 0 3px 12px rgba(15, 23, 42, 0.04)',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* App header — mirrors the room page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '6px 11px' }}>
            <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Room</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#111', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{ROOM_CODE}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex' }}>
              {PARTICIPANTS.map((p, i) => (
                <div
                  key={p.name}
                  style={{
                    width: 18, height: 18,
                    borderRadius: '50%',
                    backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #fff',
                    marginLeft: i > 0 ? -6 : 0,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{PARTICIPANTS.length} people</span>
          </div>
        </div>

        {/* Week grid */}
        <div style={{ display: 'flex', gap: 3 }}>

          {/* Time labels */}
          <div style={{ width: 30, flexShrink: 0 }}>
            <div style={{ height: 32 }} />
            <div style={{ position: 'relative', height: GRID_H }}>
              {HOURS.map((label, i) => (
                <div
                  key={label}
                  style={{
                    position: 'absolute',
                    top: `${(i / (HOURS.length - 1)) * 100}%`,
                    right: 4,
                    transform: 'translateY(-50%)',
                    fontSize: 9,
                    color: '#9CA3AF',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {DAYS.map((day, di) => {
            const isToday = di === TODAY;
            const dayBlocks = BLOCKS.filter(b => b.d === di);

            return (
              <div key={day} style={{ flex: 1 }}>

                {/* Day header — mirrors WeekView's day header row */}
                <div style={{ height: 32, textAlign: 'center', paddingTop: 2 }}>
                    <div style={{ fontSize: 8, fontWeight: 600, color: isToday ? ACCENT : '#9CA3AF', letterSpacing: '0.06em' }}>
                    {day}
                  </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? ACCENT : '#374151' }}>
                    {DATES[di]}
                  </div>
                </div>

                {/* Column body */}
                <div style={{
                  height: GRID_H,
                  backgroundColor: '#F7FBF8',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  position: 'relative',
                  overflow: 'hidden',
                }}>

                  <GridLines />

                  {/* Availability blocks — colored like the real overlap rendering */}
                  {dayBlocks.map((b, j) => (
                    <div key={j} style={{
                      position: 'absolute',
                      top: `${b.t}%`,
                      height: `${b.h}%`,
                      left: 0, right: 0,
                      backgroundColor: b.overlap ? OVERLAP_COLOR : PARTICIPANT_BG_COLORS[b.p % PARTICIPANT_BG_COLORS.length],
                    }} />
                  ))}

                  {/* Animated selection on today */}
                  {isToday && (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: `${SEL_TOP}%`,
                        left: 0, right: 0,
                        backgroundColor: 'rgba(61,154,92,0.18)',
                        border: `2px solid ${ACCENT}`,
                        borderRadius: 3,
                        pointerEvents: 'none',
                        animation: 'cs-sel 5s ease-in-out infinite',
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8, height: 8,
                        borderRadius: '50%',
                        backgroundColor: ACCENT,
                        boxShadow: '0 0 0 3px rgba(61,154,92,0.18)',
                        pointerEvents: 'none',
                        animation: 'cs-dot 5s ease-in-out infinite',
                      }} />
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {PARTICIPANTS.map((p, i) => (
              <span key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: TEXT_MUTED }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                {p.name}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>Drag to propose →</span>
        </div>

      </div>
    </>
  );
}
