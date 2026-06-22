import Link from 'next/link';

import LegalLayout, { LegalSection } from '../components/LegalLayout';

export default function TermsPage() {
  const sections: LegalSection[] = [
    {
      id: 'acceptance-of-these-terms',
      title: 'Acceptance of These Terms',
      content: (
        <>
          <p>
            These Terms of Use govern your access to and use of ClearSlot. By
            using ClearSlot, you agree to these Terms of Use and to the{' '}
            <Link
              href="/privacy"
              className="font-medium text-[#236a43] underline decoration-[#b7ddc2] underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            If you do not agree to these Terms of Use or the Privacy Policy, do
            not use ClearSlot.
          </p>
        </>
      ),
    },
    {
      id: 'what-clearslot-does',
      title: 'What ClearSlot Does',
      content: (
        <>
          <p>
            ClearSlot is a scheduling product that helps people compare
            availability, coordinate shared scheduling rooms, and confirm a
            meeting time together.
          </p>
          <p>
            ClearSlot can determine availability from a connected Google
            Calendar or from an uploaded .ics calendar file. Once a time is
            confirmed, ClearSlot can also generate a downloadable .ics file so
            you can add that confirmed time to your own calendar application.
          </p>
        </>
      ),
    },
    {
      id: 'google-calendar-access-and-ics-features',
      title: 'Google Calendar Access and .ics Features',
      content: (
        <>
          <p>
            If you connect Google Calendar, ClearSlot requests only the{' '}
            <code>https://www.googleapis.com/auth/calendar.readonly</code>{' '}
            scope. ClearSlot reads calendar timing information so it can
            determine when you are busy or free.
          </p>
          <p>
            ClearSlot does not request Google Calendar write access and does
            not create, edit, or delete Google Calendar events through the
            Google API.
          </p>
          <p>
            ClearSlot also supports optional .ics file import. This lets you
            provide availability from another calendar application without
            connecting Google Calendar.
          </p>
          <p>
            ClearSlot&apos;s .ics export feature creates a downloadable calendar
            file from a confirmed meeting time only. The file is imported by
            your own device or calendar app, not written directly by ClearSlot
            into Google Calendar or any other calendar service.
          </p>
        </>
      ),
    },
    {
      id: 'rooms-and-anonymous-participation',
      title: 'Rooms and Anonymous Participation',
      content: (
        <>
          <p>
            ClearSlot&apos;s free product supports anonymous room participation.
            A room allows invited participants to compare availability and
            coordinate around the same scheduling state.
          </p>
          <p>
            Access to a room depends primarily on possession of the room code.
            Anyone with the room code may be able to access that room, so you
            should keep room codes private and share them only with people you
            intend to invite.
          </p>
          <p>
            You are responsible for deciding who receives a room code and for
            the information you choose to share through the product.
          </p>
        </>
      ),
    },
    {
      id: 'storage-retention-and-analytics',
      title: 'Storage, Retention, and Analytics',
      content: (
        <>
          <p>
            Temporary room availability payloads may be stored for up to 48
            hours so participants in a room can interact with the same
            scheduling state.
          </p>
          <p>
            ClearSlot may also collect product usage and performance telemetry
            to operate and improve the service.
          </p>
          <p>
            ClearSlot does not intentionally send calendar content or room
            payload contents to analytics tools.
          </p>
          <p>
            Detailed information about data handling, storage, retention,
            deletion, and Google user data disclosures is provided in the{' '}
            <Link
              href="/privacy"
              className="font-medium text-[#236a43] underline decoration-[#b7ddc2] underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: 'your-responsibilities',
      title: 'Your Responsibilities',
      content: (
        <>
          <p>
            You agree to use ClearSlot lawfully and in a way that does not
            interfere with the service or with other users.
          </p>
          <p>You may not:</p>
          <ul className="list-disc space-y-3 pl-6">
            <li>
              attempt to gain unauthorized access to ClearSlot, its
              infrastructure, or another person&apos;s room;
            </li>
            <li>
              upload malicious files or use the service to distribute harmful
              code;
            </li>
            <li>
              misuse room codes, impersonate another participant, or otherwise
              abuse the coordination flow.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'service-availability',
      title: 'Service Availability',
      content: (
        <>
          <p>
            ClearSlot may change, suspend, or discontinue any part of the
            service at any time.
          </p>
          <p>
            ClearSlot depends in part on third party services and user-provided
            calendar data, so uninterrupted availability and perfect scheduling
            accuracy cannot be guaranteed.
          </p>
        </>
      ),
    },
    {
      id: 'disclaimer-of-warranties',
      title: 'Disclaimer of Warranties',
      content: (
        <>
          <p>
            ClearSlot is provided on an &ldquo;as is&rdquo; and
            &ldquo;as available&rdquo; basis to the fullest extent permitted by
            law.
          </p>
          <p>
            ClearSlot does not guarantee that the service will always be
            available, error free, secure, or suitable for every scheduling
            situation.
          </p>
        </>
      ),
    },
    {
      id: 'limitation-of-liability',
      title: 'Limitation of Liability',
      content: (
        <>
          <p>
            To the fullest extent permitted by law, ClearSlot will not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages arising out of or related to your use of the
            service.
          </p>
          <p>
            To the fullest extent permitted by law, ClearSlot&apos;s total
            liability for claims arising out of or related to the service will
            not exceed the amount you paid to use ClearSlot, if any, during the
            twelve months before the claim arose.
          </p>
        </>
      ),
    },
    {
      id: 'changes-to-these-terms',
      title: 'Changes to These Terms',
      content: (
        <p>
          ClearSlot may update these Terms of Use from time to time. If we make
          material changes, we will update the date at the top of this page.
          Your continued use of ClearSlot after those changes means you accept
          the updated Terms of Use.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      content: (
        <>
          <p>
            Questions about these Terms of Use can be sent to{' '}
            <a
              href="mailto:support@clearslot.net"
              className="font-medium text-[#236a43] underline decoration-[#b7ddc2] underline-offset-4"
            >
              support@clearslot.net
            </a>
            .
          </p>
          <p>
            Privacy-specific questions can be sent to{' '}
            <a
              href="mailto:privacy@clearslot.net"
              className="font-medium text-[#236a43] underline decoration-[#b7ddc2] underline-offset-4"
            >
              privacy@clearslot.net
            </a>
            .
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalLayout
      title="Terms of Use"
      updated="June 22, 2026"
      intro={
        <p>
          These Terms of Use explain the rules that apply when you access or
          use ClearSlot.
        </p>
      }
      sections={sections}
      currentPage="terms"
    />
  );
}
