import { NextResponse } from 'next/server';

const APP_ENV       = process.env.APP_ENV      || 'dev';
const NEXTAUTH_URL  = process.env.NEXTAUTH_URL || '';

/**
 * `NEXTAUTH_URL` MUST be set in any deployment so we can verify same-origin.
 * In `APP_ENV=dev` we fall back to localhost — otherwise an unset value would
 * silently 403 every request and the clear-site-data sign-out flow would
 * break invisibly. Module-load guard keeps the failure loud, not quiet.
 */
function resolveAllowedOrigin(): string {
  if (NEXTAUTH_URL) return NEXTAUTH_URL;
  if (APP_ENV === 'dev') return 'http://localhost:3100';
  throw new Error(
    'NEXTAUTH_URL must be set when APP_ENV != "dev" — required for clear-session same-origin check',
  );
}
const ALLOWED_ORIGIN: string = resolveAllowedOrigin();

/**
 * Called from the client right after signOut() returns.
 *
 * Returns Clear-Site-Data so the browser wipes every cache associated with
 * this origin (HTTP cache, bfcache, cookies, localStorage). Without this,
 * the browser back button can resurrect authenticated pages.
 *
 * Same-origin only: a malicious site cross-posting here would otherwise log
 * the user out involuntarily.
 */
export async function POST(request: Request) {
  const origin  = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const fromAllowed =
    origin  === ALLOWED_ORIGIN ||
    !!(referer && referer.startsWith(ALLOWED_ORIGIN));

  if (!fromAllowed) {
    return NextResponse.json({ error: 'Cross-origin not allowed' }, { status: 403 });
  }

  const res = NextResponse.json({ cleared: true });
  res.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.headers.set('Cache-Control',   'no-store');
  return res;
}
