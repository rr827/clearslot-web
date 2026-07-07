import { parseISO } from 'date-fns';

export interface BusyBlock {
  start: string;
  end: string;
}

// All calendar fetching goes through the server-side proxy at /api/calendar/busy.
// The web app uses server-managed httpOnly cookies for calendar access.
export async function fetchBusyBlocks(daysAhead: number = 14, includeAllDay: boolean = true): Promise<BusyBlock[]> {
  const params = new URLSearchParams({
    daysAhead: String(daysAhead),
    includeAllDay: includeAllDay ? '1' : '0',
  });
  const res = await fetch(`/api/calendar/busy?${params.toString()}`);
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  return res.json();
}

// Microsoft path also goes through the same proxy (provider determined by cookie).
export async function fetchBusyBlocksMicrosoft(daysAhead: number = 14, includeAllDay: boolean = true): Promise<BusyBlock[]> {
  return fetchBusyBlocks(daysAhead, includeAllDay);
}

export function isHourBusy(hour: Date, blocks: BusyBlock[]): boolean {
  const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
  return blocks.some((b) => {
    const start = parseISO(b.start);
    const end = parseISO(b.end);
    return start < hourEnd && end > hour;
  });
}
