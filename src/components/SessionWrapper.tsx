'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Mounted under SessionProvider so it always has access to the session.
 * Two responsibilities:
 *   1. If a bfcache-restored page becomes visible, force a fresh load
 *      so the server-side middleware re-evaluates the session.
 *   2. If the in-memory React session says authenticated but the cookie
 *      has actually been cleared (e.g. after sign-out in another tab),
 *      navigate to /login on visibility change.
 */
function GlobalAuthEnforcer() {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // bfcache restore — discard the snapshot and reload fresh
        window.location.reload();
      }
    };
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      // Re-fetch session from server; if it's gone, send the user to /login
      const fresh = await update();
      if (!fresh && status === 'authenticated') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, update, session]);

  return null;
}

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  // Refetch on focus is enough — interval polling would hammer /api/auth/session
  // for every idle tab. The bfcache-restore + visibility listeners cover the
  // realistic "did the session go away while I was away" case.
  return (
    <SessionProvider refetchOnWindowFocus>
      <GlobalAuthEnforcer />
      {children}
    </SessionProvider>
  );
}
