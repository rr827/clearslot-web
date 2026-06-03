import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const writeToken = request.cookies.get('aligned_write_token')?.value;

  if (!writeToken) {
    return NextResponse.json({ needsWriteScope: true }, { status: 401 });
  }

  try {
    const { title, start, end } = await request.json();

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${writeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title ?? 'Meeting',
        start: { dateTime: start },
        end: { dateTime: end },
      }),
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
