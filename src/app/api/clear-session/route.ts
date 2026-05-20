import { NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.NEXTAUTH_URL || '';

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
    (ALLOWED_ORIGIN && origin  === ALLOWED_ORIGIN) ||
    (ALLOWED_ORIGIN && referer?.startsWith(ALLOWED_ORIGIN));

  if (!fromAllowed) {
    return NextResponse.json({ error: 'Cross-origin not allowed' }, { status: 403 });
  }

  const res = NextResponse.json({ cleared: true });
  res.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.headers.set('Cache-Control',   'no-store');
  return res;
}
