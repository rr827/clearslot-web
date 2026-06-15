import Logo from '../components/Logo';

// Annotation callout positioned absolutely over a screenshot
function Callout({ label, top, left, arrowDir = 'down' }: {
  label: string;
  top: string;
  left: string;
  arrowDir?: 'down' | 'up' | 'left' | 'right';
}) {
  const arrow: Record<string, React.CSSProperties> = {
    down:  { bottom: -8, left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #111' },
    up:    { top: -8,    left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '8px solid #111' },
    left:  { left: -8,  top: '50%',  transform: 'translateY(-50%)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '8px solid #111' },
    right: { right: -8, top: '50%',  transform: 'translateY(-50%)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '8px solid #111' },
  };
  return (
    <div style={{ position: 'absolute', top, left, transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'relative', backgroundColor: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
        {label}
        <div style={{ position: 'absolute', width: 0, height: 0, ...arrow[arrowDir] }} />
      </div>
    </div>
  );
}

// Screenshot with annotation overlay
function Screenshot({ src, alt, annotations, height = 'auto' }: {
  src: string;
  alt: string;
  height?: string;
  annotations?: Array<{ label: string; top: string; left: string; arrowDir?: 'down' | 'up' | 'left' | 'right' }>;
}) {
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginTop: 20 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: '100%', height, display: 'block', objectFit: 'cover', objectPosition: 'top' }} />
      {annotations?.map((a, i) => <Callout key={i} {...a} />)}
    </div>
  );
}

export default function GuidePage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo iconSize={26} textSize={18} />
        <a href="/connect" style={{ fontSize: 14, backgroundColor: '#22C55E', color: '#fff', fontWeight: 600, padding: '8px 18px', borderRadius: 999, textDecoration: 'none' }}>
          Get started free
        </a>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px 0' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
          Find a time in&nbsp;minutes,<br />not days.
        </h1>
        <p style={{ fontSize: 18, color: '#555', margin: '0 0 56px', lineHeight: 1.6 }}>
          No accounts. No back-and-forth. Just share your availability, see the overlap, and book it.
        </p>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 56 }}>

        {/* Step 1 */}
        <div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>Create or join a room</h2>
              <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: 0 }}>
                Click <strong>Get started</strong> on the homepage to create a room. You&apos;ll get a 6-letter code.
                Share the link or code with whoever you&apos;re scheduling with — they don&apos;t need an account.
              </p>
            </div>
          </div>
          <Screenshot
            src="/guide/step1-landing.png"
            alt="ClearSlot landing page with Get started button"
            height="320px"
            annotations={[
              { label: 'Click to create a room', top: '83%', left: '18%', arrowDir: 'down' },
            ]}
          />
        </div>

        <div style={{ borderLeft: '2px dashed #E5E7EB', marginLeft: 22, height: 8 }} />

        {/* Step 2 */}
        <div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>Set your preferences &amp; connect</h2>
              <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: 0 }}>
                Pick your date range and working hours, then sign in with Google or Microsoft.
                ClearSlot reads only <strong>start and end times</strong> — no event titles, no attendees.
                Nothing private ever leaves your device.
              </p>
            </div>
          </div>
          <Screenshot
            src="/guide/step2-connect.png"
            alt="ClearSlot preferences page showing date range and sleep hours"
            height="380px"
            annotations={[
              { label: 'Choose your date range', top: '32%', left: '58%', arrowDir: 'down' },
              { label: 'Set sleep/work hours', top: '58%', left: '58%', arrowDir: 'down' },
            ]}
          />
        </div>

        <div style={{ borderLeft: '2px dashed #E5E7EB', marginLeft: 22, height: 8 }} />

        {/* Step 3 */}
        <div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>See everyone&apos;s availability</h2>
              <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: '0 0 14px' }}>
                The room grid shows each person in their own color. Light green = everyone free.
                Darker colors = more people busy at that time.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { color: 'rgba(59,130,246,0.55)', label: 'Person 1 busy' },
                  { color: 'rgba(239,68,68,0.55)', label: 'Person 2 busy' },
                  { color: 'rgba(245,158,11,0.55)', label: 'Person 3 busy' },
                  { color: 'rgba(80,80,80,0.65)', label: 'Everyone busy' },
                  { color: '#DCFCE7', label: 'Everyone free', border: '1px solid #BBF7D0' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#555' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: s.color, border: s.border }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Screenshot
            src="/guide/step3-room-grid.png"
            alt="Room calendar grid showing busy blocks per participant and free times"
            annotations={[
              { label: 'Busy blocks (blue = person 1)', top: '34%', left: '47%', arrowDir: 'down' },
              { label: 'Share with others', top: '18%', left: '73%', arrowDir: 'right' },
              { label: 'Light green = free for everyone', top: '82%', left: '14%', arrowDir: 'up' },
            ]}
          />
        </div>

        <div style={{ borderLeft: '2px dashed #E5E7EB', marginLeft: 22, height: 8 }} />

        {/* Step 4 */}
        <div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>Need help? Tap the ? button</h2>
              <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: 0 }}>
                A slide-in panel walks you through dragging to select a time, proposing it, and getting
                everyone to accept. The color legend is also there so you always know who&apos;s who.
              </p>
            </div>
          </div>
          <Screenshot
            src="/guide/step4-help-panel.png"
            alt="Room page with help panel open showing 3 steps and color legend"
            annotations={[
              { label: '? opens this panel', top: '4%', left: '88%', arrowDir: 'right' },
              { label: '3-step walkthrough', top: '35%', left: '83%', arrowDir: 'left' },
              { label: 'Color legend', top: '70%', left: '83%', arrowDir: 'left' },
            ]}
          />
        </div>

        <div style={{ borderLeft: '2px dashed #E5E7EB', marginLeft: 22, height: 8 }} />

        {/* Step 5 */}
        <div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>5</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>Drag to propose, then accept</h2>
              <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, margin: 0 }}>
                Click and drag on the grid to highlight a free slot. Hit <strong>Suggest this time</strong>
                in the side panel — everyone in the room sees the proposal and can accept it.
                Once accepted, tap <strong>Add to Google Calendar</strong> and you&apos;re done.
              </p>
            </div>
          </div>
          <Screenshot
            src="/guide/step5-proposal-panel.png"
            alt="Room grid with a drag selection highlighted in green"
            annotations={[
              { label: 'Drag to select a slot', top: '48%', left: '23%', arrowDir: 'right' },
              { label: 'Then Suggest this time →', top: '20%', left: '77%', arrowDir: 'down' },
            ]}
          />
        </div>

        {/* CTA */}
        <div style={{ marginTop: 8, padding: '32px', backgroundColor: '#F0FDF4', borderRadius: 16, textAlign: 'center', border: '1px solid #BBF7D0' }}>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Ready to try it?</p>
          <p style={{ fontSize: 15, color: '#555', margin: '0 0 20px' }}>No account needed. Free forever.</p>
          <a href="/connect" style={{ display: 'inline-block', backgroundColor: '#22C55E', color: '#fff', fontSize: 16, fontWeight: 700, padding: '12px 32px', borderRadius: 999, textDecoration: 'none' }}>
            Get started — it&apos;s free
          </a>
        </div>

      </div>
    </main>
  );
}
