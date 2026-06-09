'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit() {
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setErrorMsg(data.error || 'Something went wrong');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* Logo */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 40 }}>
        <svg width="36" height="36" viewBox="0 0 1254 1254" style={{ borderRadius: 8, display: 'block' }}>
          <rect width="1254" height="1254" fill="#FEFEFE"/>
          <path fill="#22C55E" d="M549.406616,595.543884 C561.805481,612.181763 577.726074,623.595154 596.515076,631.142883 C609.635315,636.413391 623.237854,640.668030 635.894958,646.867065 C658.978271,658.172607 661.577759,687.236694 641.366577,701.722046 C634.595093,706.575256 626.972107,709.344604 618.645020,710.013611 C593.907593,712.001099 569.765991,708.077820 546.018311,701.816406 C503.366821,690.570862 463.147766,673.624390 426.680481,648.496033 C371.778961,610.665344 335.391907,559.792786 319.163574,494.869324 C295.799469,401.398346 334.245850,302.191071 414.405670,249.011795 C498.066437,193.509918 609.566833,199.227875 686.225647,263.942871 C733.093750,303.508667 759.651001,354.188019 763.744507,415.847961 C764.885559,433.035034 763.110962,450.092926 758.531494,467.377197 C755.986084,466.455414 753.696228,465.664520 751.434082,464.801208 C711.765320,449.662231 670.667297,444.603363 628.675842,449.489349 C596.927856,453.183472 570.357117,467.462219 551.120667,493.772339 C529.620483,523.178711 526.888245,563.418762 549.406616,595.543884 z"/>
          <path fill="#22C55E" d="M699.938843,503.113708 C753.187500,512.487305 802.473145,529.934570 843.883850,565.504761 C878.434387,595.182373 902.568298,631.929138 915.049500,675.553101 C940.000305,762.761047 921.401978,840.761719 859.077942,906.186584 C808.564209,959.213745 744.737427,980.644897 672.139954,969.480774 C600.873169,958.521301 547.967041,919.511963 513.408752,856.266785 C493.943329,820.642944 486.479309,782.350220 491.004425,741.872986 C491.204407,740.084167 491.630676,738.320679 491.959808,736.499451 C504.365662,740.659363 516.351990,745.073730 528.572693,748.697632 C557.843567,757.377502 587.741943,762.314575 618.324585,759.982056 C654.055603,757.256775 682.334656,741.645569 698.024109,708.298157 C714.851379,672.532227 702.720642,633.284302 667.908447,611.341064 C655.663696,603.622803 641.527893,598.900146 628.241089,592.841309 C620.833618,589.463318 613.072266,586.719604 606.029480,582.708313 C577.042419,566.198486 576.289246,529.166321 604.312378,510.980408 C615.703125,503.588257 628.356628,499.791260 641.696106,500.034912 C660.979248,500.387085 680.239868,501.979370 699.938843,503.113708 z"/>
        </svg>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em' }}>ClearSlot</span>
      </a>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E5E7EB',
        padding: '44px 40px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>

        {status === 'success' ? (
          <>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111111', marginBottom: 12 }}>
              You&apos;re on the list
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.65, margin: 0 }}>
              We&apos;ll send one email when ClearSlot launches. Nothing else.
            </p>
          </>
        ) : (
          <>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 999, padding: '5px 14px', fontSize: 12, color: '#16A34A', marginBottom: 24, fontWeight: 500 }}>
              Coming soon
            </div>

            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#111111',
              lineHeight: 1.2,
              marginBottom: 14,
              letterSpacing: '-0.03em',
            }}>
              Find the time.<br />
              <span style={{ color: '#22C55E' }}>Stay accountable.</span>
            </h1>

            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.65, marginBottom: 32 }}>
              Open a shared room, compare availability, and find a time everyone can commit to — without sharing your calendar details.
            </p>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, textAlign: 'left' }}>
              {[
                { num: '01', text: 'Open a room and share the code. No account needed.' },
                { num: '02', text: 'Everyone connects their calendar. Event details stay on their device.' },
                { num: '03', text: 'See the overlap. Propose a time. Done.' },
              ].map(({ num, text }) => (
                <div key={num} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: '0.08em', marginTop: 2, flexShrink: 0 }}>{num}</span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Email input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  color: '#111111',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'loading' || !email.trim()}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  backgroundColor: status === 'loading' ? '#16A34A' : '#22C55E',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 10,
                  border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {status === 'loading' ? 'Joining...' : 'Get early access'}
              </button>

              {status === 'error' && (
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{errorMsg}</p>
              )}

              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                No spam. One email at launch. That&apos;s it.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer note */}
      <p style={{
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 24,
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 1.6,
      }}>
        Calendar overlap is computed on your device — event details are never transmitted.{' '}
        <a href="/privacy" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy policy</a>
        {' · '}
        <a href="/terms" style={{ color: '#6B7280', textDecoration: 'none' }}>Terms</a>
      </p>

    </main>
  );
}
