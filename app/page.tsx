import WeekDemo from './components/WeekDemo';
import Logo from './components/Logo';

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

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', color: '#111111', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid #E5E7EB', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="cs-nav-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', height: 96, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Logo />
            <div className="cs-nav-links" style={{ display: 'flex', gap: 28 }}>
              <a href="#how" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>How it works</a>
              <a href="#features" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Features</a>
              <a href="#privacy" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
              <a href="/guide" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Guide</a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/connect" style={{ fontSize: 14, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>Log in</a>
            <a href="/connect" style={{ fontSize: 14, backgroundColor: '#22C55E', color: '#fff', fontWeight: 600, padding: '9px 20px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Get started — it&apos;s free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="cs-hero" style={{ maxWidth: 1200, margin: '0 auto', padding: '148px 48px 96px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
        <div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 999, padding: '6px 16px', fontSize: 13, color: '#16A34A', marginBottom: 28, fontWeight: 500 }}>
            Flexible scheduling for modern teams
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.03em', marginBottom: 20, color: '#111111' }}>
            Find the time.<br />
            <span style={{ color: '#22C55E' }}>Stay accountable.</span>
          </h1>

          {/* Subtext */}
          <p style={{ fontSize: 18, color: '#6B7280', lineHeight: 1.65, marginBottom: 36, maxWidth: 400 }}>
            Open a shared room. Propose a time. Vote.<br />
            Everyone&apos;s on the same page.
          </p>

          {/* CTAs */}
          <div className="cs-hero-ctas" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <a href="/connect" style={{ backgroundColor: '#22C55E', color: '#fff', fontWeight: 600, padding: '14px 28px', borderRadius: 999, fontSize: 15, textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
              Get started — it&apos;s free
            </a>
            <a href="#how" style={{ fontSize: 15, color: '#374151', textDecoration: 'none', border: '1.5px solid #E5E7EB', borderRadius: 999, padding: '13px 22px', fontWeight: 500, display: 'inline-block', whiteSpace: 'nowrap' }}>
              See how it works →
            </a>
          </div>

          {/* Room code input */}
          <form action="/connect" method="get" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <input
              name="room"
              type="text"
              placeholder="Have a room code? Enter it"
              maxLength={6}
              style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 999, padding: '11px 20px', fontSize: 14, color: '#111111', outline: 'none', width: 240 }}
            />
            <button type="submit" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 999, padding: '11px 20px', fontSize: 14, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Join →
            </button>
          </form>

          {/* Feature bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Save time', desc: 'Eliminate back-and-forth and find times faster.' },
              { label: 'Coordinate easily', desc: 'See everyone\'s availability in one shared view.' },
              { label: 'Private by design', desc: 'Event details never leave your device.' },
            ].map((item, i) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#16A34A' }}>
                  {i === 0 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  )}
                  {i === 1 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                </div>
                <div style={{ fontSize: 14, color: '#374151' }}>
                  <strong style={{ fontWeight: 600 }}>{item.label}</strong>
                  {' '}
                  <span style={{ color: '#6B7280' }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live demo */}
        <WeekDemo />
      </section>

      {/* Features */}
      <section id="features" style={{ borderTop: '1px solid #E5E7EB', padding: '96px 0' }}>
        <div className="cs-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontSize: 11, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 600 }}>BUILT FOR BUSY TEAMS</p>
          <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 56, color: '#111111', maxWidth: 520 }}>Everything you need to find the right time</h2>
          <div className="cs-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { icon: <IconCalendar />, title: 'Smart scheduling', body: 'Find the best overlap across everyone\'s calendar automatically.' },
              { icon: <IconPeople />, title: 'Team coordination', body: 'Everyone joins the room, shares availability, and stays aligned.' },
              { icon: <IconBolt />, title: 'No account needed', body: 'Share a room code and start in seconds. No sign-up required for guests.' },
              { icon: <IconLock />, title: 'Private by design', body: 'Your event details never leave your device. Only time blocks are shared.' },
            ].map(f => (
              <div key={f.title} style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ borderTop: '1px solid #E5E7EB', padding: '96px 0' }}>
        <div className="cs-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>How it works</p>
          <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 64, color: '#111111' }}>Three steps, zero friction.</h2>
          <div className="cs-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { num: '01', title: 'Open a room', body: 'Create a shared room in one tap. Share the code — no accounts needed for anyone.' },
              { num: '02', title: 'Drag to propose a time', body: "Drag on a live calendar grid to mark when you want to meet. See everyone's availability at a glance." },
              { num: '03', title: 'Confirm and book', body: 'When you agree on a time, propose it from the room. It lands straight on your calendar.' },
            ].map((step) => (
              <div key={step.num} style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24 }}>
                <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 700, letterSpacing: '0.15em', display: 'block', marginBottom: 16 }}>{step.num}</span>
                <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, color: '#111111' }}>{step.title}</h3>
                <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" style={{ borderTop: '1px solid #E5E7EB', padding: '96px 0' }}>
        <div className="cs-privacy-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Privacy first</p>
            <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 24, color: '#111111' }}>What you share is what you choose.</h2>
            <p style={{ fontSize: 17, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>
              Every event gets stripped to a start time and end time. Nothing else. No names, no meetings, no context. Just blocks of time.
            </p>
            {['No account or sign-up required', 'Event titles and details never transmitted', 'Room availability stored 48 hours, then deleted', 'Event details stay on your device'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#374151', marginBottom: 16 }}>
                <span style={{ color: '#22C55E', fontSize: 16, fontWeight: 700 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, padding: 32 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>What gets shared</p>
            {[
              { label: 'Event title', shared: false },
              { label: 'Event description', shared: false },
              { label: 'Attendees', shared: false },
              { label: 'Location', shared: false },
              { label: 'Start time', shared: true },
              { label: 'End time', shared: true },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 14, color: '#6B7280' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 999, backgroundColor: item.shared ? 'rgba(34,197,94,0.1)' : '#F3F4F6', color: item.shared ? '#16A34A' : '#9CA3AF' }}>
                  {item.shared ? 'Shared' : 'Never shared'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: '1px solid #E5E7EB', padding: '96px 0', textAlign: 'center' }}>
        <div className="cs-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20, color: '#111111' }}>Ready to find your overlap?</h2>
          <p style={{ color: '#6B7280', marginBottom: 40, fontSize: 18 }}>No account. Open a room in seconds.</p>
          <a href="/connect" style={{ display: 'inline-block', backgroundColor: '#22C55E', color: '#fff', fontWeight: 600, padding: '18px 44px', borderRadius: 999, fontSize: 17, textDecoration: 'none' }}>
            Get started — it&apos;s free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E5E7EB', padding: '32px 0' }}>
        <div className="cs-section-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#9CA3AF' }}>ClearSlot</span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>No event details stored. No accounts. Just time.</p>
            <a href="/privacy" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Terms</a>
            <a href="mailto:support@clearslot.net" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
