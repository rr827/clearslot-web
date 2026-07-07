'use client';

import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '../components/Logo';

const ACCENT = '#22C55E';
const ACCENT_DARK = '#16A34A';
const ACCENT_SOFT = '#F0FDF4';
const ACCENT_BORDER = '#BBF7D0';
const BORDER = '#E5E7EB';
const TEXT = '#111111';
const MUTED = '#6B7280';
const SURFACE = '#FFFFFF';
const BG = '#F9FAFB';

const INTENT_OPTIONS = [
  { value: 1, label: 'Saved groups I can reschedule in one tap' },
  { value: 2, label: 'Recurring rooms that book themselves' },
  { value: 3, label: 'Attendance and accountability tracking' },
  { value: 4, label: 'Slack and calendar integrations' },
  { value: 5, label: "Honestly, none of these (free is enough)" },
];

const PREMIUM_CARDS = [
  {
    title: 'Persistent groups',
    body: 'Save a group once and reschedule in one tap — no re-entering emails or preferences.',
  },
  {
    title: 'Recurring rooms',
    body: 'Set a cadence and let ClearSlot propose times automatically as schedules shift.',
  },
  {
    title: 'Accountability',
    body: 'Track who confirmed, who rescheduled, and who keeps missing — with a paper trail.',
  },
];

type Status = 'idle' | 'submitting' | 'submitted' | 'error';

interface SubmitResult {
  position: number;
  referralCode: string;
  alreadyExists?: boolean;
}

export default function WaitlistForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const confirmedParam = searchParams.get('confirmed');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [intentDone, setIntentDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const referralUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://clearslot.net'}/waitlist?ref=${result.referralCode}`
    : '';

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || status === 'submitting') return;
    if (honeypotRef.current?.value) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), ref: refCode || undefined, website: '' }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ position: data.position, referralCode: data.referralCode, alreadyExists: data.alreadyExists });
        setStatus('submitted');
      } else {
        setErrorMsg(data.error ?? 'Something went wrong');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }, [email, refCode, status]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [referralUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'ClearSlot founding access', url: referralUrl }).catch(() => {});
    } else {
      handleCopy();
    }
  }, [referralUrl, handleCopy]);

  const handleIntent = useCallback(async (value: number) => {
    if (!result?.referralCode) return;
    setIntentDone(true);
    await fetch('/api/waitlist/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: result.referralCode, answer: value }),
    }).catch(() => {});
  }, [result?.referralCode]);

  const showConfirmed = status === 'submitted' || confirmedParam === '1';

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px 80px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 36 }}>
        <Logo />
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: 999, padding: '5px 14px', fontSize: 12,
            color: ACCENT_DARK, marginBottom: 20, fontWeight: 600,
          }}>
            Founding access
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: TEXT, lineHeight: 1.2, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
            ClearSlot is live and free.<br />
            <span style={{ color: ACCENT }}>What comes next is for the groups that keep meeting.</span>
          </h1>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 14px' }}>
            Founding members lock lifetime pricing on persistent groups, recurring rooms, and accountability tools — before anyone else.
          </p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Just need to schedule something now?{' '}
            <a href="/connect" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Use ClearSlot free →</a>
          </p>
        </div>

        {/* Premium feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {PREMIUM_CARDS.map((card) => (
            <div key={card.title} style={{
              backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '16px 20px',
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>{card.title}</p>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 8px', lineHeight: 1.55 }}>{card.body}</p>
              <p style={{ fontSize: 11, color: ACCENT_DARK, fontWeight: 600, margin: 0 }}>
                Not in the free version, never taken from it.
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: SURFACE, borderRadius: 20,
          border: `1px solid ${BORDER}`, padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {showConfirmed ? (
            <ConfirmedView
              result={result}
              confirmedParam={confirmedParam}
              referralUrl={referralUrl}
              intentDone={intentDone}
              copied={copied}
              onCopy={handleCopy}
              onShare={handleShare}
              onIntent={handleIntent}
            />
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 20px', textAlign: 'center' }}>
                Claim your founding spot
              </h2>

              {/* Hidden honeypot */}
              <input
                ref={honeypotRef}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  disabled={status === 'submitting'}
                  style={{
                    width: '100%', padding: '13px 18px',
                    backgroundColor: BG, border: `1px solid ${BORDER}`,
                    borderRadius: 10, color: TEXT, fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === 'submitting' || !email.trim()}
                  style={{
                    width: '100%', padding: '13px 18px',
                    backgroundColor: status === 'submitting' ? ACCENT_DARK : ACCENT,
                    color: SURFACE, fontWeight: 600, fontSize: 15,
                    borderRadius: 10, border: 'none',
                    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {status === 'submitting' ? 'Claiming...' : 'Claim founding access'}
                </button>

                {status === 'error' && (
                  <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{errorMsg}</p>
                )}

                <p style={{ fontSize: 12, color: MUTED, margin: 0, textAlign: 'center' }}>
                  The free tier stays free forever. This is for groups that keep meeting.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 24, textAlign: 'center', lineHeight: 1.6 }}>
          Your calendar is reduced to busy and free timing on our servers. Event names, guests, and details are never stored, and everything expires within 48 hours.{' '}
          <a href="/privacy" style={{ color: MUTED, textDecoration: 'none' }}>Privacy policy</a>
          {' · '}
          <a href="/terms" style={{ color: MUTED, textDecoration: 'none' }}>Terms</a>
        </p>
      </div>
    </main>
  );
}

function ConfirmedView({
  result,
  confirmedParam,
  referralUrl,
  intentDone,
  copied,
  onCopy,
  onShare,
  onIntent,
}: {
  result: SubmitResult | null;
  confirmedParam: string | null;
  referralUrl: string;
  intentDone: boolean;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onIntent: (v: number) => void;
}) {
  const isEmailConfirmed = confirmedParam === '1';

  return (
    <>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        backgroundColor: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L19 7" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {isEmailConfirmed ? (
        <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px', textAlign: 'center' }}>
          You&apos;re confirmed{result ? ` — #${result.position} on the list` : ''}
        </h2>
      ) : (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px', textAlign: 'center' }}>
            {result ? `You're #${result.position} on the founding list` : "You're on the list"}
          </h2>
          <p style={{ fontSize: 14, color: MUTED, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
            Check your email to confirm your spot.
          </p>
        </>
      )}

      {/* Referral section */}
      {referralUrl && (
        <div style={{
          backgroundColor: BG, border: `1px solid ${BORDER}`,
          borderRadius: 12, padding: '16px 18px', marginTop: 20, marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 6px' }}>
            Move up 10 spots for every friend who joins.
          </p>
          <p style={{ fontSize: 11, color: MUTED, margin: '0 0 12px' }}>Share your referral link:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: '8px 12px', fontSize: 12,
              color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {referralUrl}
            </div>
            <button
              onClick={onCopy}
              style={{
                backgroundColor: copied ? ACCENT_SOFT : SURFACE,
                border: `1px solid ${copied ? ACCENT_BORDER : BORDER}`,
                borderRadius: 8, padding: '8px 14px', fontSize: 12,
                fontWeight: 600, color: copied ? ACCENT_DARK : TEXT,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={onShare}
            style={{
              width: '100%', marginTop: 10, padding: '10px 16px',
              backgroundColor: ACCENT, color: SURFACE, fontWeight: 600,
              fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer',
            }}
          >
            Share link →
          </button>
        </div>
      )}

      {/* Intent question */}
      {!intentDone ? (
        <div style={{
          backgroundColor: BG, border: `1px solid ${BORDER}`,
          borderRadius: 12, padding: '16px 18px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 12px' }}>
            Which one would you actually pay for?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INTENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onIntent(opt.value)}
                style={{
                  textAlign: 'left', padding: '10px 14px',
                  backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
                  borderRadius: 8, fontSize: 13, color: TEXT,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', margin: '0 0 16px' }}>
          Thanks — that helps a lot.
        </p>
      )}

      <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', margin: 0 }}>
        While you wait,{' '}
        <a href="/connect" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
          ClearSlot free works today →
        </a>
      </p>
    </>
  );
}
