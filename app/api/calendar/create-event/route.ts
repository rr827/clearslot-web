import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const writeToken = request.cookies.get('aligned_write_token')?.value;

  if (!writeToken) {
    return NextResponse.json({ needsWriteScope: true }, { status: 401 });
  }

  try {
    const { title, start, end, attendeeEmail } = await request.json();

    const eventBody: Record<string, unknown> = {
      summary: title ?? 'Meeting',
      start: { dateTime: start },
      end: { dateTime: end },
    };

    if (attendeeEmail && typeof attendeeEmail === 'string') {
      eventBody.attendees = [{ email: attendeeEmail }];
    }

    const url = attendeeEmail
      ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all'
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${writeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (res.status === 401) {
      return NextResponse.json({ needsWriteScope: true }, { status: 401 });
    }

    if (!res.ok) {
      console.error('Create event failed:', await res.text());
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    const event = await res.json();
    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (err) {
    console.error('Create event error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
