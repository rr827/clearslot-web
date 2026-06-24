import WeekDemo from './components/WeekDemo';
import Logo from './components/Logo';

const BG = '#F8F9FC';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EBF0';
const TEXT = '#111827';
const MUTED = '#667085';
const MUTED_SOFT = '#98A2B3';
const ACCENT = '#3D9A5C';
const ACCENT_DARK = '#2F7B49';
const ACCENT_SOFT = '#EEF7F0';
const ACCENT_BORDER = '#CFE3D5';
const SHADOW = '0 18px 46px rgba(15, 23, 42, 0.07), 0 3px 12px rgba(15, 23, 42, 0.04)';

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Home() {
  const features = [
    { icon: <IconCalendar />, title: 'Smart scheduling', body: 'Find the best overlap across everyone\'s calendar automatically.' },
    { icon: <IconPeople />, title: 'Room-based coordination', body: 'Everyone joins the same room, compares availability, and sees the same proposals.' },
    { icon: <IconBolt />, title: 'Fast to start', body: 'Share a code and begin in seconds. No sign-up required for invited guests.' },
    { icon: <IconLock />, title: 'Private by design', body: 'Event details are not stored on ClearSlot servers. Shared rooms use derived timing only.' },
  ];

  const steps = [
    { num: '1', title: 'Open a room', body: 'Create a shared room in one tap and send the code to the people you need to coordinate with.' },
    { num: '2', title: 'Compare availability', body: 'Everyone connects a calendar or uploads an .ics file, then ClearSlot finds overlapping time.' },
    { num: '3', title: 'Confirm a time', body: 'Propose a slot, get agreement in the room, and export the confirmed meeting to any calendar app.' },
  ];

  const privacyRows = [
    { label: 'Event title', shared: false },
    { label: 'Event description', shared: false },
    { label: 'Attendees', shared: false },
    { label: 'Location', shared: false },
    { label: 'Start time', shared: true },
    { label: 'End time', shared: true },
  ];

  return (
    <main style={{ minHeight: '100vh', backgroundColor: BG, color: TEXT, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(248,249,252,0.94)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 rgba(17,24,39,0.02)' }}>
        <div className="cs-shell cs-nav" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px', minHeight: 88, display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 24 }}>
          <Logo />
          <div className="cs-nav-links" style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            <a href="#how" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>How it works</a>
            <a href="#features" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>Features</a>
            <a href="#privacy" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>Privacy</a>
            <a href="/guide" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>Guide</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="/connect" style={{ fontSize: 14, backgroundColor: ACCENT, color: '#fff', fontWeight: 600, padding: '12px 18px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 10px 24px rgba(61,154,92,0.16)' }}>
              Create a room
            </a>
          </div>
        </div>
      </nav>

      <section className="cs-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 40px 112px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 999, padding: '7px 16px', fontSize: 13, color: ACCENT_DARK, marginBottom: 28, fontWeight: 600 }}>
            Flexible scheduling for modern teams
          </div>
          <h1 style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.05em', margin: '0 0 24px', color: TEXT }}>
            Find time.
            <br />
            Stay Accountable.
          </h1>
          <p style={{ fontSize: 19, color: MUTED, lineHeight: 1.7, margin: '0 auto 30px', maxWidth: 680 }}>
            The easiest way for groups to find the best time, commit, and{' '}
            <span style={{ color: ACCENT, fontWeight: 700 }}>actually show up</span>.
          </p>

          <div className="cs-hero-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <a href="/connect" style={{ backgroundColor: ACCENT, color: '#fff', fontWeight: 600, padding: '16px 28px', borderRadius: 14, fontSize: 16, textDecoration: 'none', display: 'inline-block', boxShadow: '0 14px 28px rgba(61,154,92,0.18)' }}>
              Create a room
            </a>
            <a href="#join-room" style={{ fontSize: 16, color: TEXT, textDecoration: 'none', fontWeight: 600 }}>
              Join a room →
            </a>
          </div>

          <form id="join-room" action="/connect" method="get" style={{ maxWidth: 540, margin: '0 auto 26px', padding: 10, borderRadius: 18, border: `1px solid ${BORDER}`, backgroundColor: SURFACE, boxShadow: SHADOW, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT_DARK, flexShrink: 0 }}>
              <IconPeople />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap' }}>Have a room code?</span>
            <input
              name="room"
              type="text"
              placeholder="Enter room code"
              maxLength={6}
              style={{ flex: 1, backgroundColor: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', fontSize: 15, color: TEXT, outline: 'none', minWidth: 0 }}
            />
            <button type="submit" aria-label="Join room" style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: ACCENT, border: 'none', color: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <IconArrow />
            </button>
          </form>

          <div className="cs-benefits" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14, color: MUTED, fontSize: 14, fontWeight: 500, marginBottom: 42 }}>
            <span>Save time</span>
            <span style={{ color: MUTED_SOFT }}>·</span>
            <span>Coordinate easily</span>
            <span style={{ color: MUTED_SOFT }}>·</span>
            <span>Private by design</span>
          </div>
        </div>

        <div style={{ maxWidth: 1080, margin: '0 auto', backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 28, padding: 24, boxShadow: SHADOW }}>
          <WeekDemo />
        </div>
      </section>

      <section id="features" style={{ padding: '0 0 112px' }}>
        <div className="cs-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
          <p style={{ fontSize: 12, color: ACCENT_DARK, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14, fontWeight: 700 }}>Built for busy teams</p>
          <div className="cs-section-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'end', marginBottom: 42 }}>
            <h2 className="cs-h2" style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', margin: 0, color: TEXT, maxWidth: 620 }}>Everything you need to reach a real scheduling decision</h2>
            <p style={{ maxWidth: 360, color: MUTED, fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              ClearSlot is designed to reduce back-and-forth without sacrificing clarity, accountability, or privacy.
            </p>
          </div>

          <div className="cs-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 22 }}>
            {features.map((feature) => (
              <div key={feature.title} style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 28, boxShadow: SHADOW }}>
                <div className="cs-feature-icon" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT_DARK, marginBottom: 18 }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 650, color: TEXT, margin: '0 0 10px' }}>{feature.title}</h3>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.75, margin: 0 }}>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ padding: '0 0 112px' }}>
        <div className="cs-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
          <p style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14, fontWeight: 700 }}>How it works</p>
          <h2 className="cs-h2" style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 42px', color: TEXT }}>Three steps, no awkward scheduling loop.</h2>
          <div className="cs-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 22, position: 'relative' }}>
            <div className="cs-how-line" style={{ position: 'absolute', top: 32, left: '16.66%', right: '16.66%', borderTop: `1px dashed ${ACCENT_BORDER}`, zIndex: 0 }} />
            {steps.map((step) => (
              <div key={step.num} style={{ position: 'relative', zIndex: 1, backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 26, boxShadow: SHADOW }}>
                <div className="cs-step-num" style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginBottom: 18 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 650, margin: '0 0 10px', color: TEXT }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.75, margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" style={{ padding: '0 0 112px' }}>
        <div className="cs-shell cs-privacy-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14, fontWeight: 700 }}>Privacy first</p>
            <h2 className="cs-h2" style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 20px', color: TEXT }}>What gets shared is limited by design.</h2>
            <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.8, marginBottom: 28 }}>
              ClearSlot reads calendar timing to compute availability. Event titles, descriptions, attendees, and locations are not stored on ClearSlot servers as part of the room scheduling flow.
            </p>
            {[
              'No account or sign-up required for invited guests',
              'Event details are not stored in room payloads',
              'Temporary availability blocks may be stored for shared rooms',
              'Usage analytics measure product behavior, not calendar content',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#374151', marginBottom: 16 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: ACCENT, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconCheck />
                </span>
                {item}
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 28, boxShadow: SHADOW }}>
            <p style={{ fontSize: 12, color: MUTED_SOFT, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 20, fontWeight: 700 }}>What gets shared</p>
            {privacyRows.map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 15, color: MUTED }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.shared ? ACCENT_DARK : '#C2413D' }}>
                  {item.shared ? 'Shared' : 'Never shared'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 88px' }}>
        <div className="cs-shell" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ backgroundColor: '#1E2E27', borderRadius: 28, padding: '56px 36px', textAlign: 'center', boxShadow: '0 24px 52px rgba(17,24,39,0.14)' }}>
            <h2 className="cs-h2" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 18px', color: '#FFFFFF' }}>Ready to find your overlap?</h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', margin: '0 0 30px', fontSize: 18, lineHeight: 1.7 }}>
              Open a room in seconds and give everyone one place to land on the same answer.
            </p>
            <a href="/connect" style={{ display: 'inline-block', backgroundColor: '#FFFFFF', color: '#1E2E27', fontWeight: 700, padding: '16px 32px', borderRadius: 14, fontSize: 16, textDecoration: 'none' }}>
              Create a room
            </a>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '28px 0 40px' }}>
        <div className="cs-shell cs-footer" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: MUTED_SOFT }}>ClearSlot</span>
          <div className="cs-footer-links" style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <p style={{ fontSize: 12, color: MUTED_SOFT, margin: 0 }}>Usage analytics only. No calendar content is intentionally sent to analytics.</p>
            <a href="/privacy" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>Terms</a>
            <a href="mailto:support@clearslot.net" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 980px) {
          .cs-nav {
            grid-template-columns: 1fr;
            padding-top: 18px;
            padding-bottom: 18px;
          }
          .cs-nav-links {
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .cs-section-head,
          .cs-privacy-grid,
          .cs-how-grid,
          .cs-features-grid,
          .cs-footer {
            display: block !important;
          }
          .cs-features-grid > div,
          .cs-how-grid > div {
            margin-bottom: 18px;
          }
          .cs-how-line {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .cs-shell {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          .cs-hero-actions {
            flex-direction: column;
          }
          .cs-benefits {
            gap: 10px;
          }
          h1 {
            font-size: 52px !important;
          }
          .cs-h2 {
            font-size: 32px !important;
          }
          .cs-features-grid > div,
          .cs-how-grid > div {
            padding: 20px !important;
          }
          .cs-feature-icon {
            width: 36px !important;
            height: 36px !important;
          }
          .cs-step-num {
            width: 34px !important;
            height: 34px !important;
          }
          .cs-nav svg {
            width: 48px !important;
            height: 48px !important;
          }
          .cs-nav span {
            font-size: 27px !important;
          }
        }
      `}</style>
    </main>
  );
}
