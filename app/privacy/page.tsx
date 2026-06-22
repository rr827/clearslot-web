import Logo from '../components/Logo';

export default function PrivacyPage() {
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

      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '60px 40px 100px',
        }}
      >
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
          Privacy Policy
        </h1>
        <p style={{ color: '#22C55E', fontSize: '16px', marginBottom: '48px', fontFamily: 'monospace' }}>
          This policy describes exactly what ClearSlot accesses, uses, stores, shares, and deletes.
        </p>

        <Section title="The short version">
          <p>
            ClearSlot uses Google Calendar timing information to compute availability and help people coordinate shared meeting times.
            ClearSlot does not store calendar event titles, descriptions, attendees, organizers, or locations on its servers.
            ClearSlot may temporarily store derived availability blocks for shared room functionality.
            ClearSlot also uses product analytics and performance telemetry, but those analytics are not intended to include calendar content or room payload contents.
          </p>
        </Section>

        <Section title="Google User Data We Access">
          <p>
            In the initial Google Calendar connection flow, ClearSlot requests read-only Google Calendar access only.
            ClearSlot does not request Google profile, Gmail, Drive, contacts, or Google account email scopes as part of that initial flow.
          </p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Calendar timing information:</strong> start and end times needed to determine when you are busy or free.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Derived availability blocks:</strong> busy/free time ranges created from calendar timing information for scheduling features.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>OAuth/session state:</strong> temporary browser session data and short-lived cookies used to complete sign-in and maintain your connected state.
            </li>
          </ul>
          <p>
            ClearSlot does not store calendar event titles, descriptions, attendees, organizers, locations, or notes on ClearSlot servers as part of its scheduling flow.
          </p>
        </Section>

        <Section title="How We Use Google User Data">
          <p>ClearSlot uses Google user data only for user-facing scheduling functionality visible in the product.</p>
          <ul>
            <li>To read calendar timing and compute availability.</li>
            <li>To show overlap views and room-based coordination features.</li>
            <li>To let invited participants compare availability in a shared room.</li>
            <li>To support user-requested scheduling actions shown in the product.</li>
          </ul>
          <p>ClearSlot does not use Google user data for advertising, sale, brokerage, or data enrichment.</p>
          <p>ClearSlot does not use Google user data to train generalized AI or ML models.</p>
          <p>ClearSlot does not use Google user data to train personalized AI or ML models on behalf of users.</p>
        </Section>

        <Section title="How We Share Google User Data">
          <p>
            ClearSlot does not sell Google user data. ClearSlot does not share raw Google Calendar content with advertisers,
            data brokers, or analytics vendors.
          </p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Shared rooms:</strong> derived availability blocks may be shared with invited room participants only to make room scheduling work.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Infrastructure providers:</strong> temporary room payloads and site traffic may pass through infrastructure providers we use to operate the product.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics providers:</strong> Vercel Analytics and Vercel Speed Insights receive product-usage and performance telemetry only, not calendar content, event details, room codes, share links, or raw room payloads.
            </li>
          </ul>
        </Section>

        <Section title="How We Store and Protect Data">
          <p>ClearSlot handles different categories of data differently.</p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Browser/session data:</strong> OAuth state and browser session data are stored in your browser to complete authentication and keep your session active.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Authentication cookies:</strong> ClearSlot uses cookies during the OAuth callback flow, including an httpOnly access-token cookie on the server-managed Google OAuth path.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Room availability payloads:</strong> derived availability blocks used for shared rooms may be stored server-side temporarily so participants in the room can interact with the same scheduling state.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics data:</strong> usage and performance telemetry may be stored by Vercel if analytics remain enabled.
            </li>
          </ul>
          <p>
            Access to backend data is intended to be limited to operating, debugging, securing, or supporting ClearSlot.
            Calendar event details are not intended to be stored in backend room payloads.
          </p>
        </Section>

        <Section title="How Long We Retain Data">
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Room availability payloads:</strong> up to 48 hours, then deleted by expiration.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Browser session data:</strong> retained until your browser session is cleared, you disconnect, or the session expires.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Authentication cookies:</strong> retained until their configured expiration time or until you disconnect access.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics and performance telemetry:</strong> retained according to our Vercel account settings and operational needs.
            </li>
          </ul>
        </Section>

        <Section title="How Users Can Revoke Access and Request Deletion">
          <p>You can revoke Google Calendar access at any time through your Google account permissions page.</p>
          <p>
            You can also request deletion by contacting{' '}
            <a href="mailto:privacy@clearslot.net" style={{ color: '#22C55E' }}>
              privacy@clearslot.net
            </a>.
          </p>
          <p>
            Because ClearSlot supports anonymous room participation in the free product, deletion requests should include any room code,
            approximate room creation time, and any other details that will help us identify the temporary room data you want removed.
          </p>
          <p>
            Revoking Google access does not retroactively remove temporary room payloads that were already created, but those payloads
            remain subject to the 48-hour expiration window unless you request earlier deletion.
          </p>
        </Section>

        <Section title="Analytics and Product Usage Data">
          <p>
            ClearSlot collects product-usage and performance analytics to understand how people move through the product and where
            the product needs improvement.
          </p>
          <ul>
            <li>Examples include page views, room creation, room join, proposal, acceptance, and performance telemetry.</li>
            <li>ClearSlot does not intend to send raw calendar events, event titles, event descriptions, room payloads, share links, or room codes to analytics.</li>
            <li>Analytics are used to understand product behavior, not calendar content.</li>
          </ul>
        </Section>

        <Section title="AI / Model Training Disclosure">
          <p>Google user data is not used to train ClearSlot AI or ML models.</p>
          <p>ClearSlot does not transfer Google user data to third parties for AI or ML model training.</p>
        </Section>

        <Section title="Children">
          <p>
            ClearSlot is not directed to children under 13. If you believe a child used ClearSlot and you have concerns, contact us
            at the address below.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes to this privacy policy, we will update the date at the top of this page. Continued use of
            ClearSlot after changes means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this privacy policy? Reach us at{' '}
            <a href="mailto:privacy@clearslot.net" style={{ color: '#22C55E' }}>
              privacy@clearslot.net
            </a>
            .
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
      <div
        style={{
          color: '#6B7280',
          lineHeight: '1.8',
          fontSize: '16px',
        }}
      >
        {children}
      </div>
    </section>
  );
}
