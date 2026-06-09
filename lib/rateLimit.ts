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
