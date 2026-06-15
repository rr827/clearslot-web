import { parseISO } from 'date-fns';

export interface BusyBlock {
  start: string;
  end: string;
}

// All calendar fetching goes through the server-side proxy at /api/calendar/busy.
// This keeps the token (httpOnly cookie) server-side only.
// Pass accessToken for the PKCE path (Authorization header); null for server OAuth path.
export async function fetchBusyBlocks(
  accessToken: string | null = null,
  daysAhead: number = 14
): Promise<BusyBlock[]> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`/api/calendar/busy?daysAhead=${daysAhead}`, { headers });
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  return res.json();
}

// Microsoft path also goes through the same proxy (provider determined by cookie)
export async function fetchBusyBlocksMicrosoft(
  accessToken: string | null = null,
  daysAhead: number = 14
): Promise<BusyBlock[]> {
  return fetchBusyBlocks(accessToken, daysAhead);
}

export function isHourBusy(hour: Date, blocks: BusyBlock[]): boolean {
  const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
  return blocks.some((b) => {
    const start = parseISO(b.start);
    const end = parseISO(b.end);
    return start < hourEnd && end > hour;
  });
}
