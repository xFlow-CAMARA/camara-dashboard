'use client';

import { signIn, useSession } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupLink() {
  const configured = process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL;
  const isDev      = process.env.NODE_ENV !== 'production';
  const base       = configured || (isDev ? 'http://localhost:8180' : null);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!base) return null;
  const redirect = encodeURIComponent(`${origin || 'http://localhost:3100'}/login`);
  const href = `${base}/realms/camara/protocol/openid-connect/registrations`
             + `?client_id=camara-dashboard-app&response_type=code&redirect_uri=${redirect}`;
  return (
    <a href={href} className="text-sage-700 hover:text-sage-900 transition-colors underline decoration-sage-300 underline-offset-4">
      Create one
    </a>
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
    const result = await signIn('credentials', { username, password, callbackUrl, redirect: false });
    if (!result?.ok) setError(result?.error || 'Invalid username or password');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left rail — editorial mark + atmosphere */}
      <div className="hidden lg:flex w-[44%] xl:w-[40%] bg-bg-sunken border-r border-hairline relative overflow-hidden">
        {/* subtle radial wash */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(107,142,127,0.15), transparent 60%)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-ink-3 mb-12">CAMARA · 5G API</p>
            <h1 className="font-display text-[64px] leading-[0.95] tracking-[-0.025em] text-ink">
              Sign in to <br />
              ship 5G<br />
              <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>
                APIs.
              </span>
            </h1>
            <p className="mt-8 max-w-sm text-[15px] text-ink-2 leading-relaxed">
              Register an application, request operator approval, and reach the
              CAMARA network APIs that ride on top of the 5G core.
            </p>
          </div>

          {/* Tiny standalone visual: signal indicator + label, ties to the motif */}
          <div className="flex items-end gap-3 text-ink-3">
            <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '18px' }}>
              {[4, 7, 10, 13, 16].map((h, i) => (
                <span key={i} style={{
                  width: '3px', height: `${h}px`,
                  background: 'var(--sage-500)', opacity: 1 - i * 0.12, borderRadius: '1.5px',
                }} />
              ))}
            </span>
            <p className="text-[10px] uppercase tracking-[0.22em]">Connected to xFlow CAPIF</p>
          </div>
        </div>
      </div>

      {/* Right column — the form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3">CAMARA · 5G API</p>
            <h1 className="font-display text-[40px] leading-tight tracking-[-0.02em] mt-2">Sign in.</h1>
          </div>
          <h2 className="font-display text-[26px] tracking-[-0.015em] mb-1">Welcome back</h2>
          <p className="text-[13px] text-ink-3 mb-8">
            Don&apos;t have an account? <SignupLink />
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin or dev"
                className="input"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-sm bg-rust-bg border border-rust/30 text-[13px] text-rust">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="btn-primary w-full justify-center mt-2"
            >
              {submitting ? 'Signing in…' : 'Continue →'}
            </button>
          </form>

          <button
            onClick={() => setShowHint(s => !s)}
            className="mt-6 text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
          >
            {showHint ? '— Hide demo credentials' : '+ Show demo credentials'}
          </button>

          {showHint && (
            <div className="mt-3 surface px-4 py-3 text-[12px] text-ink-2 space-y-1 font-mono">
              <p><span className="text-ink-3">admin:</span> admin / admin123</p>
              <p><span className="text-ink-3">dev:&nbsp;&nbsp;</span> dev / dev123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-3">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
