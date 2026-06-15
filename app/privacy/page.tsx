import Logo from '../components/Logo';

export default function PrivacyPage() {
  return (
    <main style={{
      backgroundColor: '#FFFFFF',
      minHeight: '100vh',
      color: '#111111',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 40px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Logo iconSize={28} textSize={18} />
        <a href="/" style={{ color: '#6B7280', fontSize: '14px', textDecoration: 'none' }}>← Back</a>
      </nav>

      {/* Content */}
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '60px 40px 100px',
      }}>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Last updated: May 1, 2026
        </p>
        <h1 style={{
          fontSize: '38px',
          fontWeight: '700',
          color: '#111111',
          marginBottom: '16px',
          lineHeight: '1.2',
          letterSpacing: '-0.02em',
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#22C55E', fontSize: '16px', marginBottom: '48px', fontFamily: 'monospace' }}>
          We built ClearSlot to give you scheduling without surveillance. Your calendar event details never leave your device.
        </p>

        <Section title="The short version">
          <p>
            ClearSlot shows you and a friend when you are both free, without either of you ever sharing what you are actually doing. Your calendar events are never sent to our servers. We never see event titles, attendees, locations, or descriptions. We receive nothing except a temporary token that lets your device read your own calendar, and that token stays on your device.
          </p>
        </Section>

        <Section title="What we collect">
          <p>We collect essentially nothing. Here is the complete list:</p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Google OAuth token:</strong> A temporary access token that allows ClearSlot to read your Google Calendar on your behalf. It is stored as a secure, encrypted cookie and used only to fetch your busy/free availability — never logged, never stored persistently, and never shared with any third party.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Availability payload:</strong> When you share your availability, your device computes a busy/free block summary (no event details, no titles, no metadata) and encodes it. This encoded data is shared with room participants only. ClearSlot servers store it temporarily (up to 48 hours) solely to enable the room feature, then it expires automatically.
            </li>
          </ul>
          <p>We collect no names, no email addresses, no device identifiers, and no location data. We use Vercel Analytics to understand product usage (page views and load performance) — no calendar content is ever sent to analytics.</p>
        </Section>

        <Section title="What we do not collect">
          <p>To be explicit, ClearSlot never collects or processes:</p>
          <ul>
            <li>Calendar event titles or descriptions</li>
            <li>Event attendees or organizers</li>
            <li>Event locations</li>
            <li>Recurring event patterns</li>
            <li>Any personally identifiable information from your calendar</li>
            <li>Your name or email address</li>
            <li>Device identifiers or advertising IDs</li>
            <li>Location or IP address logs</li>
          </ul>
        </Section>

        <Section title="How the availability payload works">
          <p>
            When you share your availability, the following happens entirely on your device:
          </p>
          <ol>
            <li>Your device reads your Google Calendar using the OAuth token stored locally.</li>
            <li>Event details are immediately discarded. Only busy/free blocks (time ranges with no other information) are retained.</li>
            <li>These blocks are encoded into a Base64 string.</li>
            <li>You create or join a room. The encoded blocks are stored temporarily in our database (up to 48 hours) so your co-participants can see mutual availability.</li>
            <li>The overlap computation happens in the browser or app — never on our servers.</li>
            <li>Room data expires automatically after 48 hours and is deleted.</li>
          </ol>
        </Section>

        <Section title="Google OAuth and third parties">
          <p>
            ClearSlot uses Google OAuth to access your Google Calendar. This means Google is the only third party involved. When you connect your calendar, you are authorizing ClearSlot to read your calendar on your behalf, under Google&apos;s standard OAuth scopes. We request read-only access.
          </p>
          <p>
            ClearSlot&apos;s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: '#22C55E' }}>Google API Services User Data Policy</a>, including the Limited Use requirements. Calendar data obtained through Google APIs is used solely to compute your busy/free availability and is not used for any other purpose, not transferred to third parties, and not used for advertising.
          </p>
          <p>
            Google&apos;s privacy policy governs their handling of the OAuth authorization process. You can review it at <a href="https://policies.google.com/privacy" style={{ color: '#22C55E' }}>policies.google.com/privacy</a>.
          </p>
          <p>
            We do not sell, share, rent, or otherwise transmit any data to any third party beyond the Google OAuth process described above.
          </p>
        </Section>

        <Section title="Revoking access">
          <p>
            You can disconnect ClearSlot from your Google Calendar at any time in two ways:
          </p>
          <ul>
            <li>In the ClearSlot app: Settings → Disconnect Google Calendar</li>
            <li>Directly in your Google account: <a href="https://myaccount.google.com/permissions" style={{ color: '#22C55E' }}>myaccount.google.com/permissions</a></li>
          </ul>
          <p>
            Revoking access removes the OAuth token from your device. Any room data in our database expires automatically within 48 hours.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Room availability payloads are stored for up to 48 hours, then automatically deleted. OAuth tokens are stored only on your device and deleted when you disconnect your calendar or uninstall the app. We retain no other user data.
          </p>
        </Section>

        <Section title="Children">
          <p>
            ClearSlot is not directed at children under 13. We do not knowingly collect any information from children under 13. If you believe a child has used ClearSlot and you have concerns, contact us at the address below.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes to this privacy policy, we will update the date at the top of this page. We encourage you to review this page periodically. Continued use of ClearSlot after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this privacy policy? Reach us at:{' '}
            <a href="mailto:privacy@clearslot.net" style={{ color: '#22C55E' }}>privacy@clearslot.net</a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#111111',
        marginBottom: '16px',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      <div style={{
        color: '#6B7280',
        lineHeight: '1.8',
        fontSize: '16px',
      }}>
        {children}
      </div>
    </section>
  );
}
