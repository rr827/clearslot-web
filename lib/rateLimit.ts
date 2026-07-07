// Distributed rate limiter using Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN).
// Falls back to in-process Map when Redis env vars are absent (local dev without KV).

import { Redis } from '@upstash/redis';

// ── In-process fallback ────────────────────────────────────────────────────
interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();
let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, e] of store) { if (e.resetAt < now) store.delete(k); }
}

function localCheck(key: string, limit: number, windowMs: number): boolean {
  maybeCleanup();
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt < now) { store.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (e.count >= limit) return false;
  e.count++;
  return true;
}

function localGetCount(key: string): number {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) return 0;
  return entry.count;
}

function localGetTtlMs(key: string): number {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) return 0;
  return Math.max(0, entry.resetAt - now);
}

function localIncrement(key: string, windowMs: number): number {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count++;
  return entry.count;
}

function localSetValue(key: string, value: number, ttlMs: number): void {
  maybeCleanup();
  store.set(key, { count: value, resetAt: Date.now() + ttlMs });
}

function localClear(key: string): void {
  store.delete(key);
}

// ── Redis client (lazy, only if env vars present) ─────────────────────────
const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

/**
 * Returns true if the request should be allowed, false if rate-limited.
 * Uses Upstash Redis for cross-instance enforcement; falls back to in-process.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!redis) return localCheck(key, limit, windowMs);
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const count = await redis.incr(windowKey);
    if (count === 1) await redis.pexpire(windowKey, windowMs);
    return count <= limit;
  } catch {
    return localCheck(key, limit, windowMs);
  }
}

export async function getExpiringCounter(key: string): Promise<number> {
  if (!redis) return localGetCount(key);
  try {
    const count = await redis.get<number>(key);
    return typeof count === 'number' ? count : 0;
  } catch {
    return localGetCount(key);
  }
}

export async function getExpiringCounterTtlMs(key: string): Promise<number> {
  if (!redis) return localGetTtlMs(key);
  try {
    const ttlMs = await redis.pttl(key);
    return typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : 0;
  } catch {
    return localGetTtlMs(key);
  }
}

export async function incrementExpiringCounter(key: string, windowMs: number): Promise<number> {
  if (!redis) return localIncrement(key, windowMs);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, windowMs);
    return count;
  } catch {
    return localIncrement(key, windowMs);
  }
}

export async function setExpiringCounter(key: string, value: number, ttlMs: number): Promise<void> {
  if (!redis) {
    localSetValue(key, value, ttlMs);
    return;
  }
  try {
    await redis.set(key, value, { px: ttlMs });
  } catch {
    localSetValue(key, value, ttlMs);
  }
}

export async function clearExpiringCounter(key: string): Promise<void> {
  if (!redis) {
    localClear(key);
    return;
  }
  try {
    await redis.del(key);
  } catch {
    localClear(key);
  }
}
