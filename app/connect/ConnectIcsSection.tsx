'use client';

import { useRef, useState } from 'react';

const MAX_ICS_FILE_BYTES = 1_000_000;
const MAX_ICS_BLOCKS = 5_000;
const ICS_PARSE_TIMEOUT_MS = 1_500;

interface BusyBlock {
  start: string;
  end: string;
}

interface ConnectIcsSectionProps {
  busy: boolean;
  includeAllDay: boolean;
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

function extractIcsBlocks(text: string, includeAllDay: boolean): BusyBlock[] {
  if (/\b(?:RRULE|RDATE|EXDATE)\b/i.test(text)) {
    throw new Error('ICS_RECURRING_UNSUPPORTED');
  }

  const blocks: BusyBlock[] = [];
  const events = text.split('BEGIN:VEVENT');
  const startedAt = performance.now();

  for (let i = 1; i < events.length; i++) {
    if (performance.now() - startedAt > ICS_PARSE_TIMEOUT_MS) {
      throw new Error('ICS_PARSE_TIMEOUT');
    }

    const eventChunk = events[i];
    const dtstart = eventChunk.match(/DTSTART(?:;[^:]+)?:(.+)/);
    const dtend = eventChunk.match(/DTEND(?:;[^:]+)?:(.+)/);
    if (!dtstart || !dtend) continue;

    const startRaw = dtstart[1].trim().split(/\r?\n/)[0];
    const endRaw = dtend[1].trim().split(/\r?\n/)[0];
    const isAllDay = /^\d{8}$/.test(startRaw) && /^\d{8}$/.test(endRaw);
    if (isAllDay && !includeAllDay) continue;

    const start = parseIcsTimestamp(startRaw);
    const end = parseIcsTimestamp(endRaw);
    if (start && end) blocks.push({ start, end });
    if (blocks.length > MAX_ICS_BLOCKS) {
      throw new Error('ICS_TOO_MANY_EVENTS');
    }
  }

  return blocks;
}

export default function ConnectIcsSection({
  busy,
  includeAllDay,
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
        const blocks = extractIcsBlocks(text, includeAllDay);
        setBlockCount(blocks.length);
        setStatus('ready');
        onParsed(blocks);
      } catch (error) {
        setStatus('error');
        const message = error instanceof Error ? error.message : '';
        if (message === 'ICS_RECURRING_UNSUPPORTED') {
          setErrorMessage('Recurring .ics events are not supported yet. Please export a non-recurring range.');
        } else if (message === 'ICS_PARSE_TIMEOUT') {
          setErrorMessage('This .ics file took too long to parse. Please try a smaller export.');
        } else if (message === 'ICS_TOO_MANY_EVENTS') {
          setErrorMessage('This .ics file contains too many events. Please export a shorter date range.');
        } else {
          setErrorMessage('ClearSlot could not read this .ics file. Please try another export.');
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
