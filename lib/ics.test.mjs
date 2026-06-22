import test from 'node:test';
import assert from 'node:assert/strict';

import { generateIcsEvent } from './ics.ts';

test('generates a valid VCALENDAR wrapper', () => {
  const ics = generateIcsEvent({
    start: '2026-06-22T14:00:00.000Z',
    end: '2026-06-22T15:30:00.000Z',
  });

  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test('formats DTSTART and DTEND in UTC', () => {
  const ics = generateIcsEvent({
    start: '2026-12-03T09:15:45.000Z',
    end: '2026-12-03T10:45:30.000Z',
  });

  assert.match(ics, /DTSTART:20261203T091545Z\r\n/);
  assert.match(ics, /DTEND:20261203T104530Z\r\n/);
});

test('uses CRLF line endings throughout', () => {
  const ics = generateIcsEvent({
    start: '2026-06-22T14:00:00.000Z',
    end: '2026-06-22T15:00:00.000Z',
  });

  assert.ok(ics.includes('\r\n'));
  assert.equal(ics.includes('\n') && !ics.includes('\r\n'), false);
});

test('escapes special characters in text fields', () => {
  const ics = generateIcsEvent({
    start: '2026-06-22T14:00:00.000Z',
    end: '2026-06-22T15:00:00.000Z',
    title: 'Design, Review; Sync\\Plan',
    description: 'Line one\nLine two, bring notes;',
    location: 'Room, 2;HQ\\East',
  });

  assert.match(ics, /SUMMARY:Design\\, Review\\; Sync\\\\Plan\r\n/);
  assert.match(ics, /DESCRIPTION:Line one\\nLine two\\, bring notes\\;\r\n/);
  assert.match(ics, /LOCATION:Room\\, 2\\;HQ\\\\East\r\n/);
});

test('does not throw on minimal input', () => {
  assert.doesNotThrow(() => {
    generateIcsEvent({
      start: '2026-06-22T14:00:00.000Z',
      end: '2026-06-22T15:00:00.000Z',
    });
  });
});
