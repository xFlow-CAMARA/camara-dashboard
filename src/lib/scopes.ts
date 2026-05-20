/**
 * Single-source-of-truth fetcher for the CAMARA scope list.
 * Cached in process for SCOPE_TTL_MS to avoid hitting the FastAPI on every
 * proxy request. Falls back to the well-known list if the backend is down.
 */

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const DEV_API_KEY    = process.env.INVOKER_DEV_API_KEY    || '';
const SCOPE_TTL_MS   = 5 * 60 * 1000;

/** Last-known fallback so a momentary backend hiccup doesn't lock the proxy. */
const FALLBACK_SCOPES = [
  'quality-on-demand',
  'location-retrieval',
  'traffic-influence',
  'number-verification',
  'device-status',
  'device-reachability-status',
  'sim-swap',
];

let _cache: { ts: number; scopes: string[] } = { ts: 0, scopes: [] };

export async function getScopes(): Promise<string[]> {
  const now = Date.now();
  if (_cache.scopes.length && now - _cache.ts < SCOPE_TTL_MS) return _cache.scopes;

  try {
    const headers: Record<string, string> = {};
    if (DEV_API_KEY) headers['X-Dev-Api-Key'] = DEV_API_KEY;
    const r = await fetch(`${ONBOARDING_URL}/scopes`, { cache: 'no-store', headers });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data.scopes) && data.scopes.length) {
        _cache = { ts: now, scopes: data.scopes };
        return _cache.scopes;
      }
    }
  } catch { /* fall through */ }

  // Backend unreachable — use the last cached value if we have one, otherwise
  // the hard-coded fallback.
  return _cache.scopes.length ? _cache.scopes : FALLBACK_SCOPES;
}
