import WeekDemo from './components/WeekDemo';

function Logo() {
  return (
    <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
      <svg width="36" height="36" viewBox="0 0 1254 1254" style={{ borderRadius: 8, display: 'block' }}>
        <rect width="1254" height="1254" fill="#FEFEFE"/>
        <path fill="#22C55E" d="M549.406616,595.543884 C561.805481,612.181763 577.726074,623.595154 596.515076,631.142883 C609.635315,636.413391 623.237854,640.668030 635.894958,646.867065 C658.978271,658.172607 661.577759,687.236694 641.366577,701.722046 C634.595093,706.575256 626.972107,709.344604 618.645020,710.013611 C593.907593,712.001099 569.765991,708.077820 546.018311,701.816406 C503.366821,690.570862 463.147766,673.624390 426.680481,648.496033 C371.778961,610.665344 335.391907,559.792786 319.163574,494.869324 C295.799469,401.398346 334.245850,302.191071 414.405670,249.011795 C498.066437,193.509918 609.566833,199.227875 686.225647,263.942871 C733.093750,303.508667 759.651001,354.188019 763.744507,415.847961 C764.885559,433.035034 763.110962,450.092926 758.531494,467.377197 C755.986084,466.455414 753.696228,465.664520 751.434082,464.801208 C711.765320,449.662231 670.667297,444.603363 628.675842,449.489349 C596.927856,453.183472 570.357117,467.462219 551.120667,493.772339 C529.620483,523.178711 526.888245,563.418762 549.406616,595.543884 z"/>
        <path fill="#22C55E" d="M699.938843,503.113708 C753.187500,512.487305 802.473145,529.934570 843.883850,565.504761 C878.434387,595.182373 902.568298,631.929138 915.049500,675.553101 C940.000305,762.761047 921.401978,840.761719 859.077942,906.186584 C808.564209,959.213745 744.737427,980.644897 672.139954,969.480774 C600.873169,958.521301 547.967041,919.511963 513.408752,856.266785 C493.943329,820.642944 486.479309,782.350220 491.004425,741.872986 C491.204407,740.084167 491.630676,738.320679 491.959808,736.499451 C504.365662,740.659363 516.351990,745.073730 528.572693,748.697632 C557.843567,757.377502 587.741943,762.314575 618.324585,759.982056 C654.055603,757.256775 682.334656,741.645569 698.024109,708.298157 C714.851379,672.532227 702.720642,633.284302 667.908447,611.341064 C655.663696,603.622803 641.527893,598.900146 628.241089,592.841309 C620.833618,589.463318 613.072266,586.719604 606.029480,582.708313 C577.042419,566.198486 576.289246,529.166321 604.312378,510.980408 C615.703125,503.588257 628.356628,499.791260 641.696106,500.034912 C660.979248,500.387085 680.239868,501.979370 699.938843,503.113708 z"/>
      </svg>
      <span style={{ fontSize: 20, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em' }}>ClearSlot</span>
    </a>
  );
}

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
        <div className="cs-nav-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Logo />
            <div className="cs-nav-links" style={{ display: 'flex', gap: 28 }}>
              <a href="#how" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>How it works</a>
              <a href="#features" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Features</a>
              <a href="#privacy" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Privacy</a>
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
