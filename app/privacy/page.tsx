import LegalLayout, { LegalSection } from '../components/LegalLayout';

export default function PrivacyPage() {
  const sections: LegalSection[] = [
    {
      id: 'short-version',
      title: 'The short version',
      content: (
        <p>
          ClearSlot uses calendar timing information, from a connected Google
          Calendar, from on-device Apple Calendar access in the mobile app, or
          from an uploaded .ics file where supported, to compute availability
          and help people coordinate shared meeting times. ClearSlot does not
          store calendar event titles, descriptions, attendees, organizers, or
          locations in shared room payloads. ClearSlot temporarily stores
          derived availability blocks for shared room functionality. ClearSlot
          also uses product analytics and performance telemetry on the web
          product, and does not intentionally send calendar content or room
          payload contents to those analytics tools.
        </p>
      ),
    },
    {
      id: 'google-user-data-we-access',
      title: 'Google User Data We Access',
      children: [
        { id: 'google-user-data-we-access-web', title: 'Web app' },
        { id: 'google-user-data-we-access-mobile', title: 'Mobile app' },
      ],
      content: (
        <>
          <p>
            ClearSlot&apos;s Google Calendar connection flow is currently
            designed around read-only Google Calendar access only.
          </p>
          <h3 id="google-user-data-we-access-web">Web app</h3>
          <p>
            The ClearSlot web app requests the{' '}
            <code>https://www.googleapis.com/auth/calendar.readonly</code>{' '}
            scope from Google. This scope allows ClearSlot to read calendar
            timing information, including start times, end times, and recurring
            instances as returned by Google Calendar, so ClearSlot can
            determine when you are busy.
          </p>
          <h3 id="google-user-data-we-access-mobile">Mobile app</h3>
          <p>
            The ClearSlot mobile app also requests read-only Google Calendar
            access only. On mobile, the resulting access token is stored in the
            device&apos;s secure storage so the app can read calendar timing
            information for scheduling features.
          </p>
          <p>
            ClearSlot does not request Gmail, Google Drive, Google Contacts, or
            any other Google service scope.
          </p>
          <p>
            ClearSlot does not request any Google Calendar scope that allows
            creating, editing, or deleting events during the current
            Google-first product phase.
          </p>
          <p>The categories of Google user data ClearSlot accesses are:</p>
          <ul className="list-disc space-y-3 pl-6">
            <li>
              Calendar timing information: start times, end times, and expanded
              recurring instances, used to determine when you are busy or free.
            </li>
            <li>
              Derived availability blocks: busy time blocks and derived
              availability timing, created from calendar timing information,
              used for scheduling features.
            </li>
            <li>
              OAuth, session, and authentication state: temporary cookies,
              browser state, and secure device storage used to complete sign
              in and maintain your connected state, described in full under How
              We Store and Protect Data.
            </li>
          </ul>
          <p>
            ClearSlot does not store calendar event titles, descriptions,
            attendees, organizers, locations, calendar IDs, or event IDs in
            shared room payloads or in its room database.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-use-google-user-data',
      title: 'How We Use Google User Data',
      children: [
        { id: 'how-we-use-google-user-data-web', title: 'Web app' },
        { id: 'how-we-use-google-user-data-mobile', title: 'Mobile app' },
      ],
      content: (
        <>
          <h3 id="how-we-use-google-user-data-web">Web app</h3>
          <p>
            When you connect your Google Calendar on the web app,
            ClearSlot&apos;s server retrieves your calendar events from Google
            using your access token. This server-side process reduces events to
            the timing information needed for scheduling. The event title,
            description, attendees, location, calendar ID, and event ID are
            not written to shared room payloads or to ClearSlot&apos;s room
            storage.
          </p>
          <h3 id="how-we-use-google-user-data-mobile">Mobile app</h3>
          <p>
            When you connect your Google Calendar on the mobile app, ClearSlot
            reads Google Calendar timing data to determine your availability
            and use it for room coordination and scheduling features.
          </p>
          <p>ClearSlot uses the resulting timing data to:</p>
          <ul className="list-disc space-y-3 pl-6">
            <li>
              Determine your availability and compute overlap between you and
              the other participants in a room you create or join.
            </li>
            <li>Show overlap views and room based coordination features.</li>
            <li>
              Let invited participants compare availability within a shared
              room.
            </li>
            <li>
              Support user-requested exports such as downloadable .ics files or
              device-calendar add flows based on a confirmed meeting time,
              rather than by creating, editing, or deleting Google Calendar
              events through the Google API in the current product flow.
            </li>
          </ul>
          <p>
            ClearSlot does not use Google user data for advertising, profiling,
            sale, brokerage, or model training.
          </p>
          <p>
            ClearSlot does not use Google user data to create, edit, or delete
            Google Calendar events through the Google API in the current
            product flow.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-share-google-user-data',
      title: 'How We Share Google User Data',
      content: (
        <>
          <p>
            ClearSlot does not sell Google user data, and does not share raw
            Google Calendar content with advertisers, data brokers, or
            analytics vendors.
          </p>
          <p>
            Room participants receive only derived availability timing needed
            for scheduling, not Google event details.
          </p>
          <p>
            ClearSlot does not disclose your Google access token to room
            participants. The token is used only by ClearSlot to make Google
            API requests on your behalf where needed for the current
            read-only scheduling flow.
          </p>
          <p>
            Shared rooms: derived availability blocks, containing timing
            information only, are shared with the participants you invite into
            a room, solely to make room scheduling work.
          </p>
          <p>
            Infrastructure providers: web room payloads are stored temporarily
            using Supabase, which processes this data solely on
            ClearSlot&apos;s behalf for room functionality. Site hosting and
            traffic delivery are handled through Vercel.
          </p>
          <p>
            The mobile app also uses ClearSlot&apos;s backend room services so
            participants can join the same shared room state across devices.
          </p>
          <p>
            Analytics providers: ClearSlot&apos;s web product uses Vercel
            Analytics and Vercel Speed Insights for product usage and
            performance telemetry. ClearSlot masks room codes and strips query
            strings before sending data to Vercel Analytics. ClearSlot does not
            intentionally send calendar content, room payload contents, room
            codes, or share link query strings to analytics tools.
          </p>
          <p>
            ClearSlot does not use your calendar data to train any machine
            learning or AI model, and does not share your calendar data with
            any third party for that purpose.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-store-and-protect-data',
      title: 'How We Store and Protect Data',
      children: [
        { id: 'how-we-store-and-protect-data-web', title: 'Web app' },
        { id: 'how-we-store-and-protect-data-mobile', title: 'Mobile app' },
      ],
      content: (
        <>
          <p>
            ClearSlot handles different categories of data differently,
            depending on what the data is and how long it is needed.
          </p>
          <h3 id="how-we-store-and-protect-data-web">Web app</h3>
          <p>
            During sign in, ClearSlot creates a short lived, random value to
            prevent cross site request forgery, stored as an httpOnly cookie
            for five minutes. This value is validated against what Google
            returns during the callback step and is discarded once sign in
            completes. It contains no calendar data and no personal
            information.
          </p>
          <p>
            ClearSlot temporarily stores a small amount of in progress
            scheduling state in your browser&apos;s sessionStorage, used to
            carry information between steps of the connect and room creation
            flow, such as your questionnaire responses and the action you are
            taking. If you import an .ics calendar file on the web app to
            provide your availability, described below, the busy time blocks
            read from that file are also held in your browser&apos;s
            sessionStorage until you create or join a room, at which point they
            become part of the room&apos;s availability payload in the same
            derived availability form as availability from a connected Google
            Calendar. This data exists only in your browser and is cleared when
            your browser session ends.
          </p>
          <p>
            Separately from sessionStorage, ClearSlot stores a small room
            participation reference in your browser&apos;s localStorage, keyed
            by room code, to help your browser recognize which participant slot
            you occupy in a specific room when you return to it. This value
            persists across browser sessions, unlike the sessionStorage data
            described above, and contains a room code and a participant
            reference only, not calendar event details.
          </p>
          <p>
            Your Google access token is stored in a separate httpOnly cookie,
            set and managed entirely by ClearSlot&apos;s server, and is not
            accessible to client-side JavaScript at any point. This token is
            short lived and is never written to ClearSlot&apos;s database.
          </p>
          <h3 id="how-we-store-and-protect-data-mobile">Mobile app</h3>
          <p>
            On the mobile app, Google and Microsoft access tokens, where used,
            are stored in the device&apos;s secure storage.
          </p>
          <p>
            To complete Google sign-in, the mobile app opens a brief,
            secure in-app browser session. Google redirects to a stateless
            page at clearslot.net/mobile/google-redirect, which immediately
            forwards the sign-in result to the app through a private
            clearslot:// link on your device. This redirect page does not
            log, store, or otherwise process the sign-in result on any
            ClearSlot server; it only relays it, client-side, back into the
            app.
          </p>
          <p>
            The mobile app also stores minimal local room and session
            references needed to rejoin rooms and maintain the user&apos;s
            place in a room.
          </p>
          <p>
            The mobile app communicates with ClearSlot&apos;s backend room
            services to create rooms, join rooms, propose times, accept times,
            and synchronize room state.
          </p>
          <p>
            Room availability payloads. Across the web and mobile products,
            derived availability blocks used for shared rooms may be stored
            server side, using Supabase, for up to 48 hours, so participants in
            the room can interact with the same scheduling state. These
            payloads do not contain calendar event titles, descriptions,
            attendees, organizers, locations, calendar IDs, or event IDs,
            whether that availability came from a connected Google Calendar, an
            imported .ics file, or on-device calendar access.
          </p>
          <p>
            Analytics data. Usage and performance telemetry for the web product
            is stored by Vercel according to our account settings.
          </p>
          <p>
            During web calendar fetches, ClearSlot&apos;s server processes Google
            Calendar responses in memory and reduces them to timing information
            used for scheduling. Calendar event details are not stored in
            backend room payloads or application room tables.
          </p>
          <p>
            Access to backend data is intended to be limited to
            ClearSlot&apos;s engineering team, for the purposes of operating,
            debugging, securing, or supporting the product.
          </p>
        </>
      ),
    },
    {
      id: 'how-long-we-retain-data',
      title: 'How Long We Retain Data',
      children: [
        { id: 'how-long-we-retain-data-web', title: 'Web app' },
        { id: 'how-long-we-retain-data-mobile', title: 'Mobile app' },
      ],
      content: (
        <>
          <h3 id="how-long-we-retain-data-web">Web app</h3>
          <p>
            OAuth handshake state on the web app is discarded after five
            minutes, or immediately upon successful sign in, whichever happens
            first.
          </p>
          <p>
            Browser session data on the web app is cleared when your browser
            session ends, and in any case never persists beyond the active
            scheduling flow.
          </p>
          <p>
            Browser local storage on the web app persists in your browser until
            you clear your browser data or it is overwritten, and is not tied
            to an expiration window the way server-side room data is.
          </p>
          <h3 id="how-long-we-retain-data-mobile">Mobile app</h3>
          <p>
            Mobile secure-storage tokens remain on the device until revoked,
            expired, or removed by the user through disconnect or sign-out.
          </p>
          <p>
            Mobile local references remain on-device until cleared,
            overwritten, or removed by sign-out or app removal where
            applicable.
          </p>
          <p>
            Room availability payloads are retained for up to 48 hours across
            products, then deleted automatically by expiration.
          </p>
          <p>
            Authentication cookies on the web app are retained until their
            configured expiration time, and removed when they expire or are
            replaced by a new sign in.
          </p>
          <p>
            Analytics and performance telemetry for the web product are
            retained according to ClearSlot&apos;s Vercel account configuration.
          </p>
          <p>
            Google access tokens are short lived and are not written into
            ClearSlot&apos;s room database.
          </p>
        </>
      ),
    },
    {
      id: 'how-users-can-revoke-access-and-request-deletion',
      title: 'How Users Can Revoke Access and Request Deletion',
      children: [
        { id: 'how-users-can-revoke-access-and-request-deletion-web', title: 'Web app' },
        { id: 'how-users-can-revoke-access-and-request-deletion-mobile', title: 'Mobile app' },
      ],
      content: (
        <>
          <h3 id="how-users-can-revoke-access-and-request-deletion-web">Web app</h3>
          <p>
            You can revoke ClearSlot&apos;s access to your Google Calendar at any
            time through your Google account permissions page at{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
          <h3 id="how-users-can-revoke-access-and-request-deletion-mobile">Mobile app</h3>
          <p>
            Mobile users can also disconnect from within the app, which removes
            stored local authentication and session data from the device.
          </p>
          <p>
            You can also request deletion of your data by contacting{' '}
            <a href="mailto:privacy@clearslot.net">privacy@clearslot.net</a>.
          </p>
          <p>
            Deletion requests can remove server-side room data that can still
            be identified. Because ClearSlot supports anonymous room
            participation in the free product, deletion requests should include
            any room code, the approximate room creation time, and any other
            details that will help us identify the temporary room data you want
            removed.
          </p>
          <p>
            Revoking Google access does not retroactively remove temporary room
            payloads that were already created. Those payloads remain subject to
            the 48 hour expiration window unless you request earlier deletion.
          </p>
        </>
      ),
    },
    {
      id: 'analytics-and-product-usage-data',
      title: 'Analytics and Product Usage Data',
      content: (
        <>
          <p>
            ClearSlot&apos;s web product uses Vercel Analytics and Vercel Speed
            Insights to understand how people move through the product and
            where the product needs improvement.
          </p>
          <p>
            Examples include page views, room creation, room join, proposal,
            acceptance, and performance telemetry.
          </p>
          <p>
            ClearSlot does not intentionally send raw calendar events, event
            titles, event descriptions, room payloads, share links, room codes,
            or share link query strings to those analytics tools.
          </p>
          <p>
            Analytics are used to understand product behavior, not calendar
            content.
          </p>
        </>
      ),
    },
    {
      id: 'mobile-app-apple-calendar-access',
      title: 'Mobile App: Apple Calendar Access',
      content: (
        <>
          <p>
            On the mobile app, ClearSlot may request access to the device&apos;s
            Apple Calendar so it can read busy and free timing information
            directly from the device.
          </p>
          <p>
            This Apple Calendar access is permission-based and occurs on
            device.
          </p>
          <p>
            If you choose to add a confirmed meeting to your device calendar,
            the mobile app may create a device-calendar event locally.
          </p>
          <p>
            This Apple Calendar access does not use Google&apos;s API and is
            separate from Google OAuth.
          </p>
        </>
      ),
    },
    {
      id: 'importing-availability-from-an-ics-file',
      title: 'Importing Availability from an .ics File',
      content: (
        <>
          <p>
            On the web app, in addition to connecting a Google Calendar,
            ClearSlot allows you to provide your availability by uploading a
            standard .ics calendar file exported from another calendar
            application, such as Apple Calendar or Outlook.
          </p>
          <p>
            When you upload an .ics file on the web app, ClearSlot reads it in
            your browser to determine your busy time ranges. ClearSlot&apos;s
            parser reads only the start and end times needed to determine when
            you are busy. Event titles, descriptions, attendees, organizers,
            and locations contained in the uploaded file are not retained.
            These busy time ranges are held temporarily in your browser, as
            described above, and become part of the room&apos;s availability
            payload when you create or join a room, in the same room
            availability format as availability derived from a connected Google
            Calendar.
          </p>
          <p>
            This import feature does not involve Google&apos;s API or your
            Google account in any way, and is available whether or not you have
            connected a Google Calendar to ClearSlot.
          </p>
        </>
      ),
    },
    {
      id: 'exporting-availability-to-your-calendar-ics-files',
      title: 'Exporting Availability to Your Calendar (.ics Files)',
      content: (
        <>
          <p>
            Separately from the import feature above, ClearSlot allows you to
            export a confirmed scheduling time as a standard .ics calendar
            file, so you can add it to Google Calendar, Apple Calendar,
            Outlook, or another calendar application.
          </p>
          <p>
            On the web app, this export feature is generated in your browser
            from the confirmed meeting time only. It does not call the Google
            Calendar API and does not create, modify, or write anything to your
            Google Calendar directly.
          </p>
          <p>
            On the mobile app, ClearSlot may export or share a confirmed
            meeting as an .ics file through the device share flow if direct
            device-calendar creation is unavailable.
          </p>
          <p>
            Because this export does not use the Google Calendar API, it does
            not require any additional Google OAuth scope beyond the read-only
            access described above, and it works even if you later use the file
            with a non-Google calendar application.
          </p>
          <p>
            Note, this export feature is distinct from the .ics import feature
            described above. Importing an .ics file provides availability to
            ClearSlot, while exporting an .ics file lets you save a confirmed
            meeting time to your own calendar application after a room
            participant has accepted a proposed time.
          </p>
        </>
      ),
    },
    {
      id: 'ai-and-model-training-disclosure',
      title: 'AI and Model Training Disclosure',
      content: (
        <>
          <p>
            Google user data is not used to train ClearSlot AI or machine
            learning models.
          </p>
          <p>
            ClearSlot does not transfer Google user data to any third party for
            AI or machine learning model training.
          </p>
        </>
      ),
    },
    {
      id: 'children',
      title: 'Children',
      content: (
        <p>
          ClearSlot is not directed to children under 13. If you believe a
          child has used ClearSlot and you have concerns, contact us at the
          address below.
        </p>
      ),
    },
    {
      id: 'changes-to-this-policy',
      title: 'Changes to This Policy',
      content: (
        <p>
          If we make material changes to this privacy policy, we will update
          the date at the top of this page. Continued use of ClearSlot after
          changes means you accept the updated policy.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      content: (
        <p>
          Questions about this privacy policy? Reach us at{' '}
          <a
            href="mailto:privacy@clearslot.net"
            className="font-medium text-[#236a43] underline decoration-[#b7ddc2] underline-offset-4"
          >
            privacy@clearslot.net
          </a>
          .
        </p>
      ),
    },
  ];

  return (
    <LegalLayout
      title="Privacy Policy"
      updated="June 24, 2026"
      intro={
        <>
          <p>
            This policy describes exactly what ClearSlot accesses, uses,
            stores, shares, and deletes.
          </p>
          <p>
            This Privacy Policy applies to the ClearSlot website, the ClearSlot
            web application, and the ClearSlot mobile application. Some
            features and data flows differ between the web and mobile products,
            so this policy describes both shared ClearSlot practices and
            product-specific practices where relevant.
          </p>
        </>
      }
      sections={sections}
      currentPage="privacy"
    />
  );
}
