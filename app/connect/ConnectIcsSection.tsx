'use client';

import { useRef, useState } from 'react';
import { RRule } from 'rrule';

const MAX_ICS_FILE_BYTES = 1_000_000;
const MAX_ICS_BLOCKS = 10_000;
const ICS_PARSE_TIMEOUT_MS = 5_000;

interface BusyBlock {
  start: string;
  end: string;
}

interface ConnectIcsSectionProps {
  busy: boolean;
  includeAllDay: boolean;
  range: { start: string; end: string };
  onBusyChange: (busy: boolean) => void;
  onParsed: (blocks: BusyBlock[]) => void;
}

function parseIcsTimestamp(raw: string): string | null {
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return new Date(`${y}-${mo}-${d}T00:00:00`).toISOString();
  }

  if (/^\d{8}T\d{6}Z?$/.test(raw)) {
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    const h = raw.slice(9, 11);
    const mi = raw.slice(11, 13);
    const sec = raw.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${sec}${raw.endsWith('Z') ? 'Z' : ''}`).toISOString();
  }

  return null;
}

function parseIcsDurationMs(raw: string): number | null {
  const match = raw.trim().match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return null;

  const weeks = Number(match[1] ?? 0);
  const days = Number(match[2] ?? 0);
  const hours = Number(match[3] ?? 0);
  const minutes = Number(match[4] ?? 0);
  const seconds = Number(match[5] ?? 0);

  const totalSeconds =
    weeks * 7 * 24 * 60 * 60 +
    days * 24 * 60 * 60 +
    hours * 60 * 60 +
    minutes * 60 +
    seconds;

  return totalSeconds > 0 ? totalSeconds * 1000 : null;
}

function unfoldIcsText(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '');
}

function parseTimestampValues(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => parseIcsTimestamp(value.trim()))
    .filter((value): value is string => Boolean(value));
}

function extractIcsBlocks(
  text: string,
  includeAllDay: boolean,
  range: { start: string; end: string }
): BusyBlock[] {
  const unfoldedText = unfoldIcsText(text);
  const rangeStart = new Date(`${range.start}T00:00:00`);
  const rangeEndExclusive = new Date(`${range.end}T23:59:59.999`);

  if (!Number.isFinite(rangeStart.getTime()) || !Number.isFinite(rangeEndExclusive.getTime())) {
    throw new Error('ICS_RANGE_INVALID');
  }

  const blocks: BusyBlock[] = [];
  const events = unfoldedText.split('BEGIN:VEVENT');
  const startedAt = performance.now();

  for (let i = 1; i < events.length; i++) {
    if (performance.now() - startedAt > ICS_PARSE_TIMEOUT_MS) {
      throw new Error('ICS_PARSE_TIMEOUT');
    }

    const eventChunk = events[i];
    const dtstart = eventChunk.match(/DTSTART(?:;[^:]+)?:(.+)/);
    const dtend = eventChunk.match(/DTEND(?:;[^:]+)?:(.+)/);
    const durationMatch = eventChunk.match(/DURATION:(.+)/);
    if (!dtstart || (!dtend && !durationMatch)) continue;

    const startRaw = dtstart[1].trim().split(/\r?\n/)[0];
    const endRaw = dtend?.[1].trim().split(/\r?\n/)[0] ?? null;
    const isAllDay = /^\d{8}$/.test(startRaw) && (!!endRaw ? /^\d{8}$/.test(endRaw) : false);
    if (isAllDay && !includeAllDay) continue;

    const start = parseIcsTimestamp(startRaw);
    const end = endRaw ? parseIcsTimestamp(endRaw) : null;
    const durationMsFromField = durationMatch
      ? parseIcsDurationMs(durationMatch[1].trim().split(/\r?\n/)[0])
      : null;
    if (!start) continue;

    const durationMs = end
      ? new Date(end).getTime() - new Date(start).getTime()
      : durationMsFromField ?? 0;
    if (durationMs <= 0) continue;

    const exdateMatches = Array.from(eventChunk.matchAll(/EXDATE(?:;[^:]+)?:(.+)/g));
    const excludedStarts = new Set(
      exdateMatches.flatMap((match) =>
        parseTimestampValues(match[1]).map((value) => new Date(value).getTime())
      )
    );

    const addOccurrence = (occurrenceStart: Date) => {
      if (performance.now() - startedAt > ICS_PARSE_TIMEOUT_MS) {
        throw new Error('ICS_PARSE_TIMEOUT');
      }

      if (excludedStarts.has(occurrenceStart.getTime())) return;

      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      if (occurrenceEnd <= rangeStart || occurrenceStart >= rangeEndExclusive) return;

      blocks.push({
        start: occurrenceStart.toISOString(),
        end: occurrenceEnd.toISOString(),
      });
      if (blocks.length > MAX_ICS_BLOCKS) {
        throw new Error('ICS_TOO_MANY_EVENTS');
      }
    };

    const rruleMatch = eventChunk.match(/RRULE:(.+)/);
    const rdateMatches = Array.from(eventChunk.matchAll(/RDATE(?:;[^:]+)?:(.+)/g));

    if (rruleMatch) {
      const options = RRule.parseString(rruleMatch[1].trim());
      options.dtstart = new Date(start);
      const rule = new RRule(options);
      const occurrences = rule.between(rangeStart, rangeEndExclusive, true);
      for (const occurrenceStart of occurrences) {
        addOccurrence(occurrenceStart);
      }
    } else {
      addOccurrence(new Date(start));
    }

    for (const match of rdateMatches) {
      const explicitStarts = parseTimestampValues(match[1]);
      for (const explicitStart of explicitStarts) {
        addOccurrence(new Date(explicitStart));
      }
    }
  }

  return blocks;
}

export default function ConnectIcsSection({
  busy,
  includeAllDay,
  range,
  onBusyChange,
  onParsed,
}: ConnectIcsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'error'>('idle');
  const [blockCount, setBlockCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExportHint, setShowExportHint] = useState(false);

  const handleIcsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ICS_FILE_BYTES) {
      setStatus('error');
      setErrorMessage('This .ics file is too large. Please use a file under 1 MB.');
      e.target.value = '';
      return;
    }

    setStatus('parsing');
    setErrorMessage(null);
    onBusyChange(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const blocks = extractIcsBlocks(text, includeAllDay, range);
        setBlockCount(blocks.length);
        setStatus('ready');
        onParsed(blocks);
      } catch (error) {
        setStatus('error');
        const message = error instanceof Error ? error.message : '';
        if (message === 'ICS_PARSE_TIMEOUT') {
          setErrorMessage('This .ics file took too long to parse. Please try a smaller export.');
        } else if (message === 'ICS_RANGE_INVALID') {
          setErrorMessage('ClearSlot could not match this file to your selected date range. Please try again.');
        } else if (message === 'ICS_TOO_MANY_EVENTS') {
          setErrorMessage('This .ics file contains too many events. Please export a shorter date range.');
        } else {
          setErrorMessage('ClearSlot could not read this .ics file. Try another export or shorten the selected range.');
        }
      } finally {
        onBusyChange(false);
      }
    };

    reader.onerror = () => {
      setStatus('error');
      setErrorMessage('ClearSlot could not read this .ics file. Please try again.');
      onBusyChange(false);
    };

    reader.readAsText(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        style={{ display: 'none' }}
        onChange={handleIcsFile}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'transparent', color: '#6B7280', borderRadius: 14, padding: '14px 17px', fontSize: 14, fontWeight: 500, border: '1.5px dashed #E5E7EB', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}
      >
        {status === 'parsing' ? 'Reading file…' : status === 'ready' ? `✓ ${blockCount} events loaded` : status === 'error' ? 'Error reading file — try again' : 'Upload calendar file (.ics)'}
      </button>
      {errorMessage ? (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#B42318', marginTop: -2, lineHeight: 1.6 }}>
          {errorMessage}
        </p>
      ) : null}
      <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: -4 }}>
        Apple Calendar · Yahoo · Proton · any other calendar
      </p>

      <button
        type="button"
        onClick={() => setShowExportHint((value) => !value)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '0 0 4px' }}
      >
        How to export a .ics file {showExportHint ? '▲' : '▼'}
      </button>
      {showExportHint && (
        <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#6B7280', lineHeight: 1.8, border: '1px solid #E5E7EB' }}>
          <strong style={{ color: '#374151' }}>Google Calendar</strong> → Settings → Import &amp; Export → Export<br />
          <strong style={{ color: '#374151' }}>Apple Calendar</strong> → File → Export → Export…<br />
          <strong style={{ color: '#374151' }}>Outlook</strong> → Settings → General → Privacy &amp; data → Export mailbox
        </div>
      )}
    </>
  );
}
