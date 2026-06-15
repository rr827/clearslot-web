import Logo from '../components/Logo';

export default function TermsPage() {
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

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 40px 100px' }}>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Last updated: May 1, 2026
        </p>
        <h1 style={{ fontSize: '38px', fontWeight: '700', color: '#111111', marginBottom: '16px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
          Terms of Service
        </h1>
        <p style={{ color: '#22C55E', fontSize: '16px', marginBottom: '48px', fontFamily: 'monospace' }}>
          Simple terms for a simple tool.
        </p>

        <Section title="Acceptance">
          <p>
            By using ClearSlot (the app or website), you agree to these terms. If you do not agree, do not use ClearSlot.
          </p>
        </Section>

        <Section title="What ClearSlot does">
          <p>
            ClearSlot is a scheduling tool. It reads your calendar (with your permission), computes your busy/free availability locally on your device, and lets you share that availability with others through a room code. No calendar event details ever leave your device.
          </p>
        </Section>

        <Section title="Your responsibilities">
          <ul>
            <li>Use ClearSlot only for lawful purposes.</li>
            <li>Do not attempt to reverse-engineer, scrape, or abuse the service.</li>
            <li>Do not use ClearSlot to harass or harm others.</li>
            <li>Keep your room codes private — anyone with the code can join your room.</li>
          </ul>
        </Section>

        <Section title="Google Calendar access">
          <p>
            ClearSlot requests read-only access to your Google Calendar via OAuth. You can revoke this access at any time through your Google account settings or through the ClearSlot app. ClearSlot does not store, transmit, or sell your calendar event data.
          </p>
        </Section>

        <Section title="Room data">
          <p>
            When you create or join a room, your encoded availability payload is stored on our servers for up to 48 hours to enable the room feature. This data contains only busy/free time blocks — no event titles, attendees, or other metadata. It is automatically deleted after 48 hours.
          </p>
        </Section>

        <Section title="Service availability">
          <p>
            ClearSlot is provided as-is. We make no guarantees about uptime, accuracy, or fitness for any particular purpose. We may modify, suspend, or discontinue the service at any time without notice.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, ClearSlot and its creators are not liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including missed meetings, scheduling errors, or data loss.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            ClearSlot and its original content, features, and functionality are owned by the ClearSlot team. You may not reproduce or redistribute the service without written permission.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. We will update the date at the top of this page. Continued use of ClearSlot after changes constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms?{' '}
            <a href="mailto:support@clearslot.net" style={{ color: '#22C55E' }}>support@clearslot.net</a>
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
      <div style={{ color: '#6B7280', lineHeight: '1.8', fontSize: '16px' }}>
        {children}
      </div>
    </section>
  );
}
