'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!session?.user) return null;

  const email   = session.user.email ?? 'unknown';
  const roles   = session.user.roles ?? [];
  const isAdmin = roles.includes('admin');
  const initial = (email[0] ?? '?').toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut({ redirect: false }); } catch {}
    try { await fetch('/api/clear-session', { method: 'POST', cache: 'no-store' }); } catch {}
    window.location.replace('/login');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-pill hover:bg-card-soft transition-colors"
      >
        <span
          className="w-8 h-8 rounded-pill flex items-center justify-center text-[12px] font-semibold text-ink-on-dark"
          style={{ background: 'var(--ink)' }}
        >
          {initial}
        </span>
        <span className="text-[13px] text-ink hidden sm:inline">{email.split('@')[0]}</span>
        <svg className="w-3 h-3 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 card-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-hairline">
            <p className="text-[13px] text-ink truncate font-medium">{email}</p>
            <p className="eyebrow mt-1">
              {isAdmin ? 'Operator account' : 'Developer account'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-center px-4 py-3 text-[13px] text-rust hover:bg-rust-bg transition-colors disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
