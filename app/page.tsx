import WeekDemo from './components/WeekDemo';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.08em' }}>clearslot</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#how" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>How it works</a>
            <a href="#privacy" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy</a>
            <a href="/connect" style={{ fontSize: 14, backgroundColor: '#c8f97a', color: '#0a0a0a', fontWeight: 600, padding: '8px 20px', borderRadius: 999, textDecoration: 'none' }}>Get started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '160px 48px 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#c8f97a', display: 'inline-block' }}></span>
            No account required
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 24 }}>
            Find the time.<br />
            <span style={{ color: '#c8f97a' }}>Stay accountable.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 40, maxWidth: 420 }}>
            Open a shared room. Drag to propose a meeting time on a live calendar grid.
            See if it works for everyone — then book it.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/connect" style={{ backgroundColor: '#c8f97a', color: '#0a0a0a', fontWeight: 600, padding: '16px 32px', borderRadius: 999, fontSize: 16, textDecoration: 'none' }}>
              Open a room
            </a>
            <a href="#how" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>See how it works →</a>
          </div>

          <form action="/connect" method="get" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <input
              name="room"
              type="text"
              placeholder="Have a room code? Enter it"
              maxLength={6}
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '12px 20px', fontSize: 14, color: 'white', outline: 'none', width: 260 }}
            />
            <button type="submit" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: '12px 20px', fontSize: 14, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Join →
            </button>
          </form>
        </div>

        {/* Live demo */}
        <WeekDemo />
      </section>

      {/* How it works */}
      <section id="how" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '96px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>How it works</p>
          <h2 style={{ fontSize: 56, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>Three steps, zero friction.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { num: '01', title: 'Open a room', body: 'Create a shared room in one tap. Share the code — no accounts needed for anyone.' },
              { num: '02', title: 'Drag to propose a time', body: 'Drag on a live calendar grid to mark when you want to meet. See everyone\'s availability at a glance.' },
              { num: '03', title: 'Confirm and book', body: 'When you agree on a time, propose it from the room. It lands straight on your calendar.' },
            ].map((step) => (
              <div key={step.num} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
                <span style={{ fontSize: 13, color: '#c8f97a', fontWeight: 600, letterSpacing: '0.15em', display: 'block', marginBottom: 16 }}>{step.num}</span>
                <h3 style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '96px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Privacy first</p>
            <h2 style={{ fontSize: 52, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 24 }}>What you share is what you choose.</h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, marginBottom: 32 }}>
              Every event gets stripped to a start time and end time. Nothing else. No names, no meetings, no context. Just blocks of time.
            </p>
            {['No account or sign-up required', 'Event details stay on your device', 'Nothing stored on our servers', 'Room data never leaves the session'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
                <span style={{ color: '#c8f97a', fontSize: 16 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>What gets shared</p>
            {[
              { label: 'Event title', shared: false },
              { label: 'Event description', shared: false },
              { label: 'Attendees', shared: false },
              { label: 'Location', shared: false },
              { label: 'Start time', shared: true },
              { label: 'End time', shared: true },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 999, backgroundColor: item.shared ? 'rgba(200,249,122,0.1)' : 'rgba(255,255,255,0.05)', color: item.shared ? '#c8f97a' : 'rgba(255,255,255,0.25)' }}>
                  {item.shared ? 'Shared' : 'Never shared'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '96px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <h2 style={{ fontSize: 52, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 24 }}>Ready to find your overlap?</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 40, fontSize: 18 }}>No account. Open a room in seconds.</p>
          <a href="/connect" style={{ display: 'inline-block', backgroundColor: '#c8f97a', color: '#0a0a0a', fontWeight: 600, padding: '20px 48px', borderRadius: 999, fontSize: 18, textDecoration: 'none' }}>
            Open a room
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.3)' }}>clearslot</span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No data collected. No accounts. Just time.</p>
            <a href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Terms</a>
            <a href="mailto:support@clearslot.net" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
