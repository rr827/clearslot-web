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
      backgroundColor: '#0D0D0D',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>

      {/* Logo mark */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#1A8C6E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="1.8"/>
          <path d="M3 10h18" stroke="white" strokeWidth="1.8"/>
          <path d="M8 3v4M16 3v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="8.5" cy="15" r="1.5" fill="white"/>
          <circle cx="12" cy="15" r="1.5" fill="white"/>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: '#FFFFFF',
        letterSpacing: '-0.5px',
        marginBottom: 40,
      }}>
        ClearSlot<span style={{ color: '#1A8C6E' }}>™</span>
      </div>

      {/* Main card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#161616',
        borderRadius: 20,
        border: '1px solid #2A2A2A',
        padding: '48px 40px',
        textAlign: 'center',
      }}>

        {status === 'success' ? (
          <>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#0F3D2E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="#1A8C6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: 12,
            }}>
              You are on the list
            </h2>
            <p style={{
              fontSize: 15,
              color: '#888888',
              lineHeight: 1.6,
              margin: 0,
            }}>
              We will send one email when ClearSlot launches. Nothing else.
            </p>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.3,
              marginBottom: 16,
              letterSpacing: '-0.3px',
            }}>
              Stop texting<br />
              <span style={{ color: '#1A8C6E' }}>&ldquo;are you free?&rdquo;</span>
            </h1>

            <p style={{
              fontSize: 16,
              color: '#AAAAAA',
              lineHeight: 1.65,
              marginBottom: 12,
            }}>
              ClearSlot shows you and a friend exactly when
              you are both free, without either of you revealing
              what is on your calendar.
            </p>

            <p style={{
              fontSize: 14,
              color: '#666666',
              lineHeight: 1.6,
              marginBottom: 36,
            }}>
              Your events stay on your phone. Always.
            </p>

            {/* How it works */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 40,
              textAlign: 'left',
            }}>
              {[
                { step: '01', text: 'Connect your calendar. Event details never leave your device.' },
                { step: '02', text: 'Share your availability. One link, no account required.' },
                { step: '03', text: 'See the overlap. Both schedules compared locally, privately.' },
              ].map(({ step, text }) => (
                <div key={step} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 16px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: 10,
                  border: '1px solid #222222',
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#1A8C6E',
                    letterSpacing: '0.5px',
                    marginTop: 2,
                    flexShrink: 0,
                  }}>{step}</span>
                  <span style={{
                    fontSize: 14,
                    color: '#CCCCCC',
                    lineHeight: 1.5,
                  }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Email input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #333333',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <button
                onClick={handleSubmit}
                disabled={status === 'loading' || !email.trim()}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  backgroundColor: status === 'loading' ? '#0F5A44' : '#1A8C6E',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 10,
                  border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {status === 'loading' ? 'Joining...' : 'Get on the waitlist'}
              </button>

              {status === 'error' && (
                <p style={{ color: '#E05C5C', fontSize: 13, margin: 0 }}>{errorMsg}</p>
              )}

              <p style={{ fontSize: 12, color: '#555555', margin: 0 }}>
                No spam. One email at launch. That is it.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Privacy note */}
      <p style={{
        fontSize: 12,
        color: '#444444',
        marginTop: 28,
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 1.6,
      }}>
        Calendar overlap is computed on your device — event details are never transmitted.{' '}
        <a href="/privacy" style={{ color: '#555555' }}>Privacy policy</a>.
      </p>

    </main>
  );
}
