import { parseISO } from 'date-fns';

export interface BusyBlock {
  start: string;
  end: string;
}

interface NormalizeBusyBlockOptions {
  range?: { start: string; end: string } | null;
}

export function normalizeBusyBlocks(
  blocks: BusyBlock[],
  options: NormalizeBusyBlockOptions = {}
): BusyBlock[] {
  const rangeStart = options.range
    ? new Date(`${options.range.start}T00:00:00.000`)
    : null;
  const rangeEndExclusive = options.range
    ? new Date(new Date(`${options.range.end}T00:00:00.000`).getTime() + 24 * 60 * 60 * 1000)
    : null;

  const normalized = blocks
    .map((block) => ({
      start: new Date(block.start),
      end: new Date(block.end),
    }))
    .filter(({ start, end }) => Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start)
    .map(({ start, end }) => {
      const clippedStart = rangeStart && start < rangeStart ? rangeStart : start;
      const clippedEnd = rangeEndExclusive && end > rangeEndExclusive ? rangeEndExclusive : end;
      return { start: clippedStart, end: clippedEnd };
    })
    .filter(({ start, end }) => end > start)
    .sort((a, b) => startOf(a) - startOf(b));

  const merged: { start: Date; end: Date }[] = [];
  for (const block of normalized) {
    const current = merged[merged.length - 1];
    if (current && block.start.getTime() <= current.end.getTime()) {
      if (block.end > current.end) {
        current.end = block.end;
      }
    } else {
      merged.push({ ...block });
    }
  }

  return merged.map((block) => ({
    start: block.start.toISOString(),
    end: block.end.toISOString(),
  }));
}

function startOf(block: { start: Date }): number {
  return block.start.getTime();
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Calendar API timeout');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// All calendar fetching goes through the server-side proxy at /api/calendar/busy.
// The web app uses server-managed httpOnly cookies for calendar access.
export async function fetchBusyBlocks(
  daysAhead: number = 14,
  includeAllDay: boolean = true,
  timeoutMs: number = 15_000
): Promise<BusyBlock[]> {
  const params = new URLSearchParams({
    daysAhead: String(daysAhead),
    includeAllDay: includeAllDay ? '1' : '0',
  });
  const res = await fetchWithTimeout(`/api/calendar/busy?${params.toString()}`, {}, timeoutMs);
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  return res.json();
}

// Microsoft path also goes through the same proxy (provider determined by cookie).
export async function fetchBusyBlocksMicrosoft(
  daysAhead: number = 14,
  includeAllDay: boolean = true,
  timeoutMs: number = 15_000
): Promise<BusyBlock[]> {
  return fetchBusyBlocks(daysAhead, includeAllDay, timeoutMs);
}

export function isHourBusy(hour: Date, blocks: BusyBlock[]): boolean {
  const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
  return blocks.some((b) => {
    const start = parseISO(b.start);
    const end = parseISO(b.end);
    return start < hourEnd && end > hour;
  });
}
