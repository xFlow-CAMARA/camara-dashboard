/**
 * Tiny in-memory token-bucket rate limiter.
 *
 * IMPORTANT — scope: this lives in the Next.js process memory. Each Next.js
 * worker keeps its own buckets, which means:
 *
 *   • A multi-instance deployment (load-balanced dashboards) sees up to
 *     `instances × capacity` burst per key, not `capacity`. For real
 *     brute-force protection at scale, migrate to a Redis INCR+TTL backend
 *     (kept TODO at the bottom).
 *   • Restarts reset every bucket. Fine for speed-bump use; not for hard
 *     quotas.
 *
 * Use it as a defence-in-depth speed-bump only. Real abuse should be caught
 * upstream (Kong, WAF, Keycloak's own brute-force detection on the IDP).
 */

interface Bucket {
  tokens:   number;
  updated:  number;       // epoch ms
}

const _buckets = new Map<string, Bucket>();

export interface RateLimitOpts {
  /** Max tokens in the bucket (== max burst). */
  capacity:   number;
  /** Tokens added per second. */
  refillRate: number;
}

/** Try to consume one token for `key`. Returns true if allowed. */
export function take(key: string, opts: RateLimitOpts): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = _buckets.get(key);
  if (!b) {
    _buckets.set(key, { tokens: opts.capacity - 1, updated: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Refill since last update
  const elapsedSec = (now - b.updated) / 1000;
  b.tokens  = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillRate);
  b.updated = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  const retryAfterMs = Math.ceil((1 - b.tokens) / opts.refillRate * 1000);
  return { allowed: false, retryAfterMs };
}

/** Two-window guard: a short burst limit AND a longer sustained-rate limit.
 *  Both must allow the request. Defeats "slow-and-steady" attackers who
 *  pace themselves to the bucket refill rate forever. */
export function takeMultiWindow(
  key: string,
  burst:    RateLimitOpts,
  sustained: RateLimitOpts,
): { allowed: boolean; retryAfterMs: number } {
  const b = take(`${key}:burst`, burst);
  if (!b.allowed) return b;
  const s = take(`${key}:sustained`, sustained);
  if (!s.allowed) return s;
  return { allowed: true, retryAfterMs: 0 };
}

// Periodically evict idle buckets so memory doesn't grow unbounded.
// Guard against Next.js HMR creating multiple intervals on file save in dev.
declare global {
  var __rlEvictTimer: ReturnType<typeof setInterval> | undefined;
}

const EVICT_AFTER_MS = 10 * 60 * 1000;
if (!globalThis.__rlEvictTimer) {
  globalThis.__rlEvictTimer = setInterval(() => {
    const cutoff = Date.now() - EVICT_AFTER_MS;
    _buckets.forEach((b, k) => {
      if (b.updated < cutoff) _buckets.delete(k);
    });
  }, 60 * 1000);
  globalThis.__rlEvictTimer.unref?.();
}
