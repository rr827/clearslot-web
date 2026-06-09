'use client';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DATES = [8, 9, 10, 11, 12, 13, 14];
const TODAY = 3; // THU

const PARTICIPANTS = [
  { name: 'Alex',   color: '#22C55E' },
  { name: 'Sam',    color: '#4ADE80' },
  { name: 'Taylor', color: '#86EFAC' },
  { name: 'Jordan', color: '#D1D5DB' },
];

const GRID_H = 210; // px — represents 9am–2pm (5 hours)

// d = dayIndex, t = top%, h = height%, p = participant index
const BLOCKS = [
  { d: 0, t: 10, h: 22, p: 0 }, // MON Alex
  { d: 0, t: 42, h: 18, p: 1 }, // MON Sam
  { d: 1, t: 20, h: 28, p: 1 }, // TUE Sam
  { d: 1, t: 68, h: 18, p: 2 }, // TUE Taylor
  { d: 2, t:  2, h: 22, p: 0 }, // WED Alex
  { d: 2, t: 40, h: 20, p: 2 }, // WED Taylor
  { d: 2, t: 72, h: 24, p: 3 }, // WED Jordan
  { d: 3, t: 32, h: 20, p: 1 }, // THU Sam
  { d: 4, t: 20, h: 22, p: 0 }, // FRI Alex
  { d: 4, t: 78, h: 18, p: 2 }, // FRI Taylor
  { d: 5, t: 10, h: 18, p: 3 }, // SAT Jordan
];

// Selection on THU grows from 9am (0%) to ~noon (58%)
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

export default function WeekDemo() {
  return (
    <>
      <style>{css}</style>
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        padding: '18px 16px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* App header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Room</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#111', cursor: 'default' }}>
            Design Sync
            <span style={{ color: '#9CA3AF', fontSize: 9 }}>▾</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex' }}>
              {PARTICIPANTS.map((p, i) => (
                <div
                  key={p.name}
                  style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    backgroundColor: p.color,
                    border: '2px solid #fff',
                    marginLeft: i > 0 ? -7 : 0,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#6B7280' }}>4 people</span>
          </div>
        </div>

        {/* Week grid */}
        <div style={{ display: 'flex', gap: 3 }}>

          {/* Time labels */}
          <div style={{ width: 30, flexShrink: 0 }}>
            <div style={{ height: 38 }} />
            <div style={{ position: 'relative', height: GRID_H }}>
              {['9am', '10am', '11am', '12pm', '1pm', '2pm'].map((label, i) => (
                <div
                  key={label}
                  style={{
                    position: 'absolute',
                    top: `${(i / 5) * 100}%`,
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

                {/* Day header */}
                <div style={{ height: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 1, paddingTop: 2 }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: isToday ? '#22C55E' : '#9CA3AF', letterSpacing: '0.06em' }}>
                    {day}
                  </div>
                  <div style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#22C55E' : 'transparent',
                    color: isToday ? '#fff' : '#374151',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {DATES[di]}
                  </div>
                </div>

                {/* Column body */}
                <div style={{
                  height: GRID_H,
                  backgroundColor: '#F9FAFB',
                  borderRadius: 6,
                  position: 'relative',
                  overflow: 'hidden',
                }}>

                  {/* Hour grid lines */}
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: `${(i / 5) * 100}%`,
                      borderTop: '1px solid #F3F4F6',
                      pointerEvents: 'none',
                    }} />
                  ))}

                  {/* Availability blocks */}
                  {dayBlocks.map((b, j) => (
                    <div key={j} style={{
                      position: 'absolute',
                      top: `${b.t}%`,
                      height: `${b.h}%`,
                      left: 2, right: 2,
                      backgroundColor: PARTICIPANTS[b.p].color,
                      borderRadius: 4,
                    }} />
                  ))}

                  {/* Animated selection on today */}
                  {isToday && (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: `${SEL_TOP}%`,
                        left: 2, right: 2,
                        backgroundColor: 'rgba(74,222,128,0.2)',
                        border: '1.5px solid #22C55E',
                        borderRadius: 4,
                        pointerEvents: 'none',
                        animation: 'cs-sel 5s ease-in-out infinite',
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8, height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#22C55E',
                        boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
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
            {PARTICIPANTS.map(p => (
              <span key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6B7280' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, display: 'inline-block', flexShrink: 0 }} />
                {p.name}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 500 }}>Drag to propose →</span>
        </div>

      </div>
    </>
  );
}
