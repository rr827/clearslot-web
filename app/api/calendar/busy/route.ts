import { NextRequest, NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/clientIp';

// Server-side calendar proxy.
// Reads the httpOnly aligned_token cookie (server OAuth path) or
// an Authorization: Bearer header (PKCE path), then fetches busy blocks
// from Google or Microsoft on behalf of the user.

const GOOGLE_FETCH_TIMEOUT_MS = 15_000;
const MICROSOFT_FETCH_TIMEOUT_MS = 15_000;

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGoogleEventBlocks(
  token: string,
  daysAhead: number,
  includeAllDay: boolean
): Promise<{ start: string; end: string }[]> {
  const timeMin = new Date().toISOString();
  const timeMax = addDays(new Date(), daysAhead).toISOString();

  const res = await fetchWithTimeout(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?' +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      }),
    { headers: { Authorization: `Bearer ${token}` } },
    GOOGLE_FETCH_TIMEOUT_MS,
    'Google Calendar timeout'
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

async function fetchGoogleFreeBusyBlocks(
  token: string,
  daysAhead: number
): Promise<{ start: string; end: string }[]> {
  const timeMin = new Date().toISOString();
  const timeMax = addDays(new Date(), daysAhead).toISOString();

  const res = await fetchWithTimeout(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      }),
    },
    GOOGLE_FETCH_TIMEOUT_MS,
    'Google Calendar timeout'
  );

  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`);
  const data = await res.json();
  return (data.calendars?.primary?.busy || []).map((block: { start: string; end: string }) => ({
    start: block.start,
    end: block.end,
  }));
}

async function fetchGoogleBlocks(
  token: string,
  daysAhead: number,
  includeAllDay: boolean
): Promise<{ start: string; end: string }[]> {
  // freeBusy is much faster for ClearSlot's main availability use case because
  // it returns busy ranges directly without expanding full event objects.
  if (includeAllDay) {
    return fetchGoogleFreeBusyBlocks(token, daysAhead);
  }

  // When all-day events should be ignored, we still need event-level detail to
  // distinguish timed events from date-only all-day events.
  return fetchGoogleEventBlocks(token, daysAhead, includeAllDay);
}

async function fetchMicrosoftBlocks(
  token: string,
  daysAhead: number,
  includeAllDay: boolean
): Promise<{ start: string; end: string }[]> {
  const startDateTime = new Date().toISOString();
  const endDateTime = addDays(new Date(), daysAhead).toISOString();

  const res = await fetchWithTimeout(
    'https://graph.microsoft.com/v1.0/me/calendarView?' +
      new URLSearchParams({ startDateTime, endDateTime, $top: '250' }),
    { headers: { Authorization: `Bearer ${token}` } },
    MICROSOFT_FETCH_TIMEOUT_MS,
    'Microsoft Calendar timeout'
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

  // Two independent dimensions: IP (protects against distributed abuse) and a
  // non-reversible hash of the caller's own token (protects one person's own
  // token from being throttled by unrelated traffic sharing their IP, e.g.
  // office/campus wifi, and vice versa).
  const ip = getClientIp(request);
  const tokenHash = await hashToken(token);
  const [ipAllowed, tokenAllowed] = await Promise.all([
    checkRateLimit(`calendar_busy:${ip}`, 10, 60_000),
    checkRateLimit(`calendar_busy_token:${tokenHash}`, 10, 60_000),
  ]);
  if (!ipAllowed || !tokenAllowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
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
