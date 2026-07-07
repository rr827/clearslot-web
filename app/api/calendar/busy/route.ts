import { NextRequest, NextResponse } from 'next/server';
import { addDays } from 'date-fns';

// Server-side calendar proxy.
// Reads the httpOnly aligned_token cookie (server OAuth path) or
// an Authorization: Bearer header (PKCE path), then fetches busy blocks
// from Google or Microsoft on behalf of the user.

async function fetchGoogleBlocks(
  token: string,
  daysAhead: number,
  includeAllDay: boolean
): Promise<{ start: string; end: string }[]> {
  const timeMin = new Date().toISOString();
  const timeMax = addDays(new Date(), daysAhead).toISOString();

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      }),
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`);
  const data = await res.json();
  return (data.items || [])
    .flatMap((e: any) => {
      if (e.start?.dateTime && e.end?.dateTime) {
        return [{ start: e.start.dateTime, end: e.end.dateTime }];
      }
      if (includeAllDay && e.start?.date && e.end?.date) {
        return [{
          start: new Date(`${e.start.date}T00:00:00`).toISOString(),
          end: new Date(`${e.end.date}T00:00:00`).toISOString(),
        }];
      }
      return [];
    });
}

async function fetchMicrosoftBlocks(
  token: string,
  daysAhead: number,
  includeAllDay: boolean
): Promise<{ start: string; end: string }[]> {
  const startDateTime = new Date().toISOString();
  const endDateTime = addDays(new Date(), daysAhead).toISOString();

  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendarView?' +
      new URLSearchParams({ startDateTime, endDateTime, $top: '250' }),
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Microsoft Calendar error: ${res.status}`);
  const data = await res.json();
  return (data.value || [])
    .filter((e: any) => e.start?.dateTime && e.end?.dateTime && (includeAllDay || !e.isAllDay))
    .map((e: any) => ({
      start: new Date(e.start.dateTime + (e.start.timeZone === 'UTC' ? 'Z' : '')).toISOString(),
      end: new Date(e.end.dateTime + (e.end.timeZone === 'UTC' ? 'Z' : '')).toISOString(),
    }));
}

export async function GET(request: NextRequest) {
  // Accept token from httpOnly cookie (server OAuth) or Authorization header (PKCE)
  const cookieToken = request.cookies.get('aligned_token')?.value;
  const authHeader = request.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = cookieToken ?? headerToken;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysAhead = Math.max(1, Math.min(90, Number(searchParams.get('daysAhead') ?? '14')));
  const includeAllDay = searchParams.get('includeAllDay') !== '0';
  const provider = request.cookies.get('aligned_provider')?.value ?? 'google';

  try {
    const blocks = provider === 'microsoft'
      ? await fetchMicrosoftBlocks(token, daysAhead, includeAllDay)
      : await fetchGoogleBlocks(token, daysAhead, includeAllDay);
    return NextResponse.json(blocks);
  } catch (err: any) {
    console.error('Calendar proxy error:', err.message);
    return NextResponse.json({ error: 'Calendar fetch failed' }, { status: 502 });
  }
}
