'use client';

import { signIn, useSession } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Renders the "New here? Sign up" link only when we know where Keycloak lives
 * for the browser. In dev we fall back to localhost. In any other build the
 * link is omitted (rather than silently pointing at the wrong URL) — the
 * operator must set NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL explicitly.
 */
function SignupLink() {
  const configured = process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL;
  const isDev      = process.env.NODE_ENV !== 'production';
  const base       = configured || (isDev ? 'http://localhost:8180' : null);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  if (!base) return null;     // production without explicit config — no link

  const redirect = encodeURIComponent(`${origin || 'http://localhost:3100'}/login`);
  const href = `${base}/realms/camara/protocol/openid-connect/registrations`
             + `?client_id=camara-dashboard-app&response_type=code&redirect_uri=${redirect}`;

  return (
    <div className="mt-4 text-center">
      <a href={href} className="text-sm text-blue-600 hover:underline">New here? Sign up</a>
      <p className="text-[11px] text-slate-400 mt-1">
        Self-service signs you up as a developer. Admins are provisioned by the operator.
      </p>
    </div>
  );
}

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const isAdmin = session.user.roles?.includes('admin');
      router.replace(isAdmin ? '/admin/invokers' : '/developer/status');
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await signIn('credentials', {
      username,
      password,
      callbackUrl,
      redirect: false,
    });
    if (!result?.ok) {
      setError(result?.error || 'Invalid username or password');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">CAMARA API Portal</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin or dev"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <SignupLink />


        <button
          onClick={() => setShowHint(s => !s)}
          className="w-full mt-4 text-xs text-gray-500 hover:underline"
        >
          {showHint ? 'Hide' : 'Show'} demo credentials
        </button>

        {showHint && (
          <div className="mt-3 bg-gray-50 rounded p-4 text-xs text-gray-700 space-y-1 font-mono">
            <p><span className="font-semibold text-gray-900">Admin:</span>   admin / admin123</p>
            <p><span className="font-semibold text-gray-900">Developer:</span> dev / dev123</p>
            <p className="mt-2 text-gray-500 font-sans">
              All authentication is handled by Keycloak (camara realm).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
