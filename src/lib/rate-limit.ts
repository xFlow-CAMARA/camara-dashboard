/**
 * Tiny in-memory token-bucket rate limiter.
 *
 * Scoped per dashboard process (no Redis/external store). Sufficient as a
 * brute-force speed-bump on session-keyed endpoints; serious abuse should
 * be caught upstream (Kong, WAF, Keycloak's own brute-force detection).
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

// Periodically evict idle buckets so memory doesn't grow unbounded
const EVICT_AFTER_MS = 10 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - EVICT_AFTER_MS;
  _buckets.forEach((b, k) => {
    if (b.updated < cutoff) _buckets.delete(k);
  });
}, 60 * 1000).unref?.();
