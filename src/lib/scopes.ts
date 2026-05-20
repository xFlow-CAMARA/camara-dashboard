/**
 * Single-source-of-truth fetcher for the CAMARA scope list.
 *
 * Backend `/scopes` is the only authority. We cache it in-process for a
 * short TTL to absorb burst load, but never fall back to a hard-coded
 * list — that would silently serve stale data after a realm change.
 *
 * Concurrency: a single in-flight fetch is shared between callers
 * (single-flight pattern) so a stampede of requests after expiry doesn't
 * fan out into N parallel backend calls.
 */

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const DEV_API_KEY    = process.env.INVOKER_DEV_API_KEY    || '';
const SCOPE_TTL_MS   = 60 * 1000;     // 60s — short enough to converge after a realm change

let _cache: { ts: number; scopes: string[] } = { ts: 0, scopes: [] };
let _inflight: Promise<string[]> | null = null;

async function _fetchScopes(): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (DEV_API_KEY) headers['X-Dev-Api-Key'] = DEV_API_KEY;
  const r = await fetch(`${ONBOARDING_URL}/scopes`, { cache: 'no-store', headers });
  if (!r.ok) throw new Error(`Backend /scopes returned ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data.scopes) || !data.scopes.length) {
    throw new Error('Backend /scopes returned empty list');
  }
  return data.scopes;
}

/** Returns the canonical CAMARA scope list. Throws if backend is down and
 *  the cache is empty — callers should translate to a 503 for clients. */
export async function getScopes(): Promise<string[]> {
  const now = Date.now();
  if (_cache.scopes.length && now - _cache.ts < SCOPE_TTL_MS) return _cache.scopes;

  // Single-flight: concurrent first-fetches share one promise
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const scopes = await _fetchScopes();
      _cache = { ts: Date.now(), scopes };
      return scopes;
    } finally {
      _inflight = null;
    }
  })();

  try {
    return await _inflight;
  } catch (e) {
    // If we have any cache at all (even expired), serve it rather than failing.
    if (_cache.scopes.length) return _cache.scopes;
    throw e;
  }
}
