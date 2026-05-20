'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Client-side belt-and-braces guard.
 * - If session is gone, sends user to /login.
 * - Re-runs on bfcache restore (browser back/forward button) so a stale
 *   in-memory page does not show after sign-out.
 *
 * Pass `requireAdmin` to restrict to admin role.
 */
export default function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const roles = session?.user?.roles ?? [];
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (requireAdmin && !roles.includes('admin')) {
      router.replace('/login');
    }
  }, [status, session, requireAdmin, router]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // bfcache restore — force a fresh load so guards re-evaluate
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (status !== 'authenticated') return null;
  if (requireAdmin && !session?.user?.roles?.includes('admin')) return null;
  return <>{children}</>;
}
