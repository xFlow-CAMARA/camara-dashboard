'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!session?.user) return null;

  const email = session.user.email ?? 'unknown';
  const roles = session.user.roles ?? [];
  const isAdmin = roles.includes('admin');
  const initial = (email[0] ?? '?').toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
    } catch {
      /* fall through */
    }
    try {
      await fetch('/api/clear-session', { method: 'POST', cache: 'no-store' });
    } catch {
      /* best-effort cache wipe */
    }
    // Replace history entry so back button can't return to the previous user's page.
    window.location.replace('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold ${isAdmin ? 'bg-indigo-600' : 'bg-blue-600'}`}>
          {initial}
        </div>
        <span className="text-sm text-gray-800">{email.split('@')[0]}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
          {isAdmin ? 'admin' : 'developer'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b text-sm">
            <p className="font-medium text-gray-900 truncate">{email}</p>
            <p className="text-xs text-gray-500 mt-0.5">Roles: {roles.join(', ') || '—'}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
