import { BusyBlock } from './calendar';

export type Preference = 'morning' | 'afternoon' | 'evening' | 'none';

export interface AlignedPayload {
  range: { start: string; end: string };
  sleep: { from: string; to: string } | null;
  preference: Preference | null;
  includeAllDay?: boolean;
  blocks: BusyBlock[];
  blocked?: { from: string; to: string }[] | null; // recurring daily time ranges to hard-block
  uid?: string;          // stable random UUID for duplicate-join detection
  displayName?: string;  // user-chosen display name (optional, privacy-controlled)
  source?: 'google' | 'microsoft' | 'ics' | 'manual'; // how blocks were produced
}

// ── V2 helpers ─────────────────────────────────────────────────────────────

function b64encode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64decode(str: string): string {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return atob(padded);
}

export function encodePayload(payload: AlignedPayload): string {
  const compact = {
    v: 2,
    r: { s: payload.range.start, e: payload.range.end },
    sl: payload.sleep ?? null,
    p: payload.preference ?? null,
    ad: payload.includeAllDay ?? true,
    b: payload.blocks.map((b) => [
      Math.floor(new Date(b.start).getTime() / 1000),
      Math.floor(new Date(b.end).getTime() / 1000),
    ]),
    bk: payload.blocked?.length ? payload.blocked.map(b => [b.from, b.to]) : null,
    u: payload.uid ?? null,
    dn: payload.displayName ?? null,
    sc: payload.source ?? null,
  };
  return b64encode(JSON.stringify(compact));
}

export function decodePayload(encoded: string): AlignedPayload {
  try {
    const raw = JSON.parse(b64decode(encoded));

    // V2 format — handles both compact keys (r,sl,p,b,u,dn) and mobile full-JSON keys (range,sleep,preference,blocks)
    if (raw?.v === 2) {
      const range = raw.r
        ? { start: raw.r.s, end: raw.r.e }
        : (raw.range ?? { start: '', end: '' });
      const sleep = raw.sl !== undefined ? raw.sl : (raw.sleep ?? null);
      const preference = raw.p !== undefined ? raw.p : (raw.preference ?? null);
      const includeAllDay = raw.ad !== undefined ? Boolean(raw.ad) : (raw.includeAllDay ?? true);
      const blocks: BusyBlock[] = raw.b
        ? (raw.b as number[][]).map(([s, e]) => ({
            start: new Date(s * 1000).toISOString(),
            end: new Date(e * 1000).toISOString(),
          }))
        : (raw.blocks ?? []);
      const blocked: { from: string; to: string }[] | null = raw.bk
        ? (raw.bk as string[][]).map(([f, t]) => ({ from: f, to: t }))
        : (raw.blocked ?? null);
      return {
        range,
        sleep,
        preference,
        includeAllDay,
        blocks,
        blocked,
        uid: raw.u ?? raw.uid ?? undefined,
        displayName: raw.dn ?? raw.displayName ?? undefined,
        source: raw.sc ?? raw.source ?? undefined,
      };
    }

    // V1 fallback: raw is number[][]
    if (Array.isArray(raw) && Array.isArray(raw[0])) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        range: { start: today, end: today },
        sleep: null,
        preference: null,
        includeAllDay: true,
        blocks: (raw as number[][]).map(([s, e]) => ({
          start: new Date(s * 1000).toISOString(),
          end: new Date(e * 1000).toISOString(),
        })),
      };
    }

    return { range: { start: '', end: '' }, sleep: null, preference: null, includeAllDay: true, blocks: [] };
  } catch {
    return { range: { start: '', end: '' }, sleep: null, preference: null, includeAllDay: true, blocks: [] };
  }
}

// ── Link builders ──────────────────────────────────────────────────────────

export function buildRoomLink(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://getaligned.app';
  return `${base}/room/${code}`;
}
