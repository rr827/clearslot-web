import Logo from '../components/Logo';

export default function TermsPage() {
  return (
    <main
      style={{
        backgroundColor: '#FFFFFF',
        minHeight: '100vh',
        color: '#111111',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <nav
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo iconSize={56} textSize={36} />
        <a href="/" style={{ color: '#6B7280', fontSize: '14px', textDecoration: 'none' }}>
          ← Back
        </a>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 40px 100px' }}>
        <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
          Last updated: June 22, 2026
        </p>
        <h1
          style={{
            fontSize: '38px',
            fontWeight: '700',
            color: '#111111',
            marginBottom: '16px',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
          }}
        >
          Terms of Service
        </h1>
        <p style={{ color: '#22C55E', fontSize: '16px', marginBottom: '48px', fontFamily: 'monospace' }}>
          Terms that match how ClearSlot actually works today.
        </p>

        <Section title="Acceptance">
          <p>By using ClearSlot, you agree to these terms. If you do not agree, do not use ClearSlot.</p>
        </Section>

        <Section title="What ClearSlot does">
          <p>
            ClearSlot is a scheduling and availability coordination product. With your permission, it reads calendar timing
            information to determine when you are busy or free, derives availability blocks from that timing, and lets you compare
            and coordinate availability in shared rooms.
          </p>
        </Section>

        <Section title="Google Calendar access">
          <p>
            In the initial Google connection flow, ClearSlot requests read-only Google Calendar access only. That
            access is used to compute availability. ClearSlot does not require a Google Calendar write scope for the
            downloadable <code>.ics</code> export used to save confirmed meeting times.
          </p>
        </Section>

        <Section title="Room data">
          <p>
            When you create or join a room, ClearSlot may store derived availability blocks on its servers for up to 48 hours so room
            participants can interact with the same shared scheduling state. These room payloads are intended to contain availability
            timing only, not calendar event titles, descriptions, attendees, or locations.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            ClearSlot may collect product-usage analytics and performance telemetry to understand how the product is used and where it
            should improve. These analytics are not intended to include raw calendar content or room payload contents.
          </p>
        </Section>

        <Section title="Your responsibilities">
          <ul>
            <li>Use ClearSlot only for lawful purposes.</li>
            <li>Do not attempt to reverse-engineer, scrape, or abuse the service.</li>
            <li>Do not use ClearSlot to harass or harm others.</li>
            <li>Keep room codes private. Anyone with the room code may be able to access the room.</li>
          </ul>
        </Section>

        <Section title="Service availability">
          <p>
            ClearSlot is provided as-is. We do not guarantee uninterrupted availability, complete accuracy, or fitness for a
            particular purpose. We may change, suspend, or discontinue the service at any time.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, ClearSlot and its creators are not liable for indirect, incidental, special, or
            consequential damages arising from your use of the service, including missed meetings, scheduling errors, or data loss.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            ClearSlot and its original content, features, and functionality are owned by the ClearSlot team. You may not reproduce or
            redistribute the service without written permission.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. We will update the date at the top of this page. Continued use of ClearSlot
            after changes means you accept the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms?{' '}
            <a href="mailto:support@clearslot.net" style={{ color: '#22C55E' }}>
              support@clearslot.net
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111111',
          marginBottom: '16px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <div style={{ color: '#6B7280', lineHeight: '1.8', fontSize: '16px' }}>{children}</div>
    </section>
  );
}
