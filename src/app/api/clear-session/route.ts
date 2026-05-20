import { NextResponse } from 'next/server';

/**
 * Called from the client right after signOut() returns.
 * The Clear-Site-Data header tells the browser to wipe every
 * cache associated with this origin — kills bfcache, kills any
 * stored HTML from authenticated pages, kills service-worker caches.
 */
export async function POST() {
  const res = NextResponse.json({ cleared: true });
  // "cache" covers HTTP cache + bfcache
  // "cookies" wipes any leftover session cookies
  // "storage" wipes localStorage / sessionStorage / IndexedDB
  res.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
