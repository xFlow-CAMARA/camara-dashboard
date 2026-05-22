'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!session?.user) return null;

  const email = session.user.email ?? 'unknown';
  const roles = session.user.roles ?? [];
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
        className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-transparent hover:border-hairline hover:bg-bg-elev transition-colors"
      >
        {/* Avatar — sage for admin, warm sand for developer; small letter inside */}
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium text-bg-elev"
          style={{ background: isAdmin ? 'var(--sage-700)' : '#B89968' }}
        >
          {initial}
        </span>
        <span className="text-[13px] text-ink-2">{email.split('@')[0]}</span>
        <svg className="w-3 h-3 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 surface-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-hairline">
            <p className="text-[13px] text-ink truncate">{email}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-3 mt-1">
              {isAdmin ? 'Operator account' : 'Developer account'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-4 py-3 text-[13px] text-rust hover:bg-rust-bg transition-colors disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
