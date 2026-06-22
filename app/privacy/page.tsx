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
            ClearSlot&apos;s initial Google Calendar connection flow requests the{' '}
            <code>https://www.googleapis.com/auth/calendar.readonly</code> scope from Google. This scope allows
            ClearSlot to read calendar event timing information, including start times, end times, and recurring
            instances as returned by Google Calendar, so ClearSlot can determine when you are busy.
          </p>
          <p>
            ClearSlot does not request Gmail, Google Drive, Google Contacts, or other Google service scopes as part
            of that initial connection flow.
          </p>
          <p>
            ClearSlot does not request any Google Calendar scope that allows creating, editing, or deleting events.
            ClearSlot also does not request Gmail, Drive, Contacts, or other Google service scopes for scheduling.
          </p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Calendar timing information:</strong> start times, end times,
              and expanded recurring instances used to determine when you are busy or free.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Derived availability blocks:</strong> busy/free time ranges
              created from calendar timing information for scheduling features.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>OAuth/session state:</strong> temporary browser session data and
              short-lived cookies used to complete sign-in and maintain connected state.
            </li>
          </ul>
          <p>
            ClearSlot does not store calendar event titles, descriptions, attendees, organizers, locations, calendar
            IDs, or event IDs in shared room payloads or in its room database.
          </p>
        </Section>

        <Section title="How We Use Google User Data">
          <p>
            When you connect your Google Calendar, ClearSlot&apos;s server retrieves your calendar events from Google
            using your access token. This server-side process reduces events to timing information needed for
            scheduling.
          </p>
          <p>
            The event title, description, attendees, location, calendar ID, and event ID are not written to shared
            room payloads or to the application&apos;s room storage. ClearSlot uses the resulting timing data to
            determine availability and compute overlap between you and the other participants in a room you create or
            join.
          </p>
          <ul>
            <li>To read calendar timing and compute availability.</li>
            <li>To show overlap views and room-based coordination features.</li>
            <li>To let invited participants compare availability in a shared room.</li>
            <li>To support user-requested exports such as downloadable .ics files that do not call Google APIs.</li>
          </ul>
          <p>
            ClearSlot does not use Google user data for advertising, profiling, sale, brokerage, or data enrichment.
          </p>
          <p>ClearSlot does not use Google user data to train generalized AI or ML models.</p>
          <p>ClearSlot does not use Google user data to train personalized AI or ML models on behalf of users.</p>
        </Section>

        <Section title="How We Share Google User Data">
          <p>
            ClearSlot does not sell Google user data. ClearSlot does not share raw Google Calendar content with
            advertisers, data brokers, or analytics vendors.
          </p>
          <p>
            Your Google access token is not shared with room participants. ClearSlot uses the token only to call the
            relevant Google API on your behalf.
          </p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Shared rooms:</strong> derived availability blocks containing
              timing information may be shared with invited room participants only to make room scheduling work.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Infrastructure providers:</strong> temporary room payloads are
              stored using Supabase, which processes this data solely on ClearSlot&apos;s behalf for room
              functionality. Site traffic and application hosting are handled through Vercel.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics providers:</strong> Vercel Analytics and Vercel Speed
              Insights receive product-usage and performance telemetry only. ClearSlot strips query strings and masks
              room codes before analytics are sent. Calendar content, Google account data, and room payload contents
              are not intended to be sent to those analytics tools.
            </li>
          </ul>
          <p>
            ClearSlot does not use your calendar data to train any machine learning or AI model, and does not share
            your calendar data with third parties for that purpose.
          </p>
        </Section>

        <Section title="How We Store and Protect Data">
          <p>ClearSlot handles different categories of data differently.</p>
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Browser/session data:</strong> OAuth state and browser session
              data are stored in your browser to complete authentication and keep your session active.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Authentication cookies:</strong> in the current web OAuth flow,
              ClearSlot stores Google access tokens in server-managed <code>httpOnly</code> cookies so the token is
              not readable by client-side JavaScript.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Room availability payloads:</strong> derived availability blocks
              used for shared rooms may be stored server-side temporarily so participants in the room can interact
              with the same scheduling state.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics data:</strong> usage and performance telemetry may be
              stored by Vercel if analytics remain enabled.
            </li>
          </ul>
          <p>
            During calendar fetches, ClearSlot&apos;s server processes Google Calendar responses in memory and reduces
            them to timing information used for scheduling. Calendar event details are not intended to be stored in
            backend room payloads or application room tables.
          </p>
          <p>
            Access to backend data is intended to be limited to operating, debugging, securing, or supporting
            ClearSlot.
          </p>
        </Section>

        <Section title="How Long We Retain Data">
          <ul>
            <li>
              <strong style={{ color: '#22C55E' }}>Room availability payloads:</strong> up to 48 hours, then deleted by expiration.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Browser session data:</strong> retained until your browser
              session is cleared or the relevant session data expires.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Authentication cookies:</strong> retained until their configured
              expiration time and removed when they expire or are overwritten by a new auth flow.
            </li>
            <li>
              <strong style={{ color: '#22C55E' }}>Analytics and performance telemetry:</strong> retained according to our Vercel account settings and operational needs.
            </li>
          </ul>
          <p>
            Google access tokens are short-lived and are not written into ClearSlot&apos;s room database.
          </p>
        </Section>

        <Section title="How Users Can Revoke Access and Request Deletion">
          <p>
            You can revoke Google Calendar access at any time through your Google account permissions page at{' '}
            <a href="https://myaccount.google.com/permissions" style={{ color: '#22C55E' }}>
              myaccount.google.com/permissions
            </a>.
          </p>
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

        <Section title="Exporting Availability to Your Calendar (.ics Files)">
          <p>
            ClearSlot allows you to export a confirmed scheduling time as a standard <code>.ics</code> calendar
            file so you can add it to Google Calendar, Apple Calendar, Outlook, or another calendar application.
          </p>
          <p>
            This export feature does not call the Google Calendar API and does not create, modify, or write anything
            to your Google Calendar directly. Instead, ClearSlot generates a calendar file containing only the
            confirmed meeting time, which you then choose to open or import using your own device and calendar app.
          </p>
          <p>
            Because this export does not use the Google Calendar API, it does not require any additional Google OAuth
            scope beyond the read-only access described above.
          </p>
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
