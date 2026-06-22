export interface IcsEventInput {
  start: string | number | Date;
  end: string | number | Date;
  title?: string;
  description?: string;
  location?: string;
}

function toDate(value: string | number | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid event date');
  return date;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtc(value: Date): string {
  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
    'T',
    pad(value.getUTCHours()),
    pad(value.getUTCMinutes()),
    pad(value.getUTCSeconds()),
    'Z',
  ].join('');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function generateIcsEvent({
  start,
  end,
  title = 'ClearSlot Meeting',
  description,
  location,
}: IcsEventInput): string {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (endDate <= startDate) {
    throw new Error('Event end must be after start');
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClearSlot//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@clearslot.net`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(startDate)}`,
    `DTEND:${formatUtc(endDate)}`,
    `SUMMARY:${escapeText(title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeText(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.join('\r\n')}\r\n`;
}
