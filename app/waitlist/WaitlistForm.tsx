'use client';

import { useState } from 'react';
import Logo from '../components/Logo';

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
      <div style={{ marginBottom: 40 }}>
        <Logo />
      </div>

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
