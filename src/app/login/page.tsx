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
    <a href={href} className="underline decoration-ink-3 underline-offset-4 hover:text-ink">
      Create one
    </a>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/uaeconnect-logo-cropped.png"
        alt="UAEConnect"
        className="w-11 h-11 object-contain"
        style={{ filter: 'brightness(0)' }}
      />
      <span className="font-display text-[22px] tracking-[-0.02em] text-ink" style={{ fontWeight: 800 }}>
        UAEConnect
      </span>
    </div>
  );
}

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';

  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [showHint,   setShowHint]   = useState(false);

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
    <div className="min-h-screen bg-bg p-4 lg:p-6 flex items-center justify-center">
      <div className="w-full max-w-6xl">

        {/* Top bar — floating pill, just like the app shell */}
        <div className="card-lg px-5 py-3 flex items-center justify-between mb-4 lg:mb-6">
          <BrandLockup />
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-ink-2">
            <a href="#" className="hover:text-ink transition-colors">Docs</a>
            <a href="#" className="hover:text-ink transition-colors">API</a>
            <a href="#" className="hover:text-ink transition-colors">About</a>
          </div>
          <SignupLinkButton />
        </div>

        {/* Bento — hero on the right, side tiles on the left */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-3 lg:gap-4">

          {/* Left column: stacked tiles, varied colors */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">

            {/* Tile: tagline — pale blue accent */}
            <div className="card-blue rounded-lg px-5 py-5 col-span-2 lg:col-span-1 relative overflow-hidden">
              <p className="eyebrow mb-3" style={{ color: 'rgba(11,13,16,0.55)' }}>Identity</p>
              <h2 className="font-display text-[28px] leading-[0.95] tracking-[-0.03em] text-ink" style={{ fontWeight: 800 }}>
                Operator-grade
                <br />access.
              </h2>
              <p className="text-[13px] text-ink-2 mt-3">
                Single sign-on, governed credentials, scoped tokens.
              </p>
              {/* decorative concentric circles */}
              <svg className="absolute -right-6 -bottom-6 opacity-25" width="120" height="120" viewBox="0 0 120 120" aria-hidden>
                <circle cx="60" cy="60" r="55" fill="none" stroke="var(--ink)" strokeWidth="1" />
                <circle cx="60" cy="60" r="40" fill="none" stroke="var(--ink)" strokeWidth="1" />
                <circle cx="60" cy="60" r="25" fill="none" stroke="var(--ink)" strokeWidth="1" />
              </svg>
            </div>

            {/* Tile: signal — dark gradient */}
            <div className="card-gradient p-5">
              <p className="eyebrow mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Network</p>
              <div className="flex items-end gap-1.5 h-12 mb-3">
                {[5, 8, 12, 17, 22].map((h, i) => (
                  <span key={i} className="block w-2 rounded-sm" style={{
                    height: `${h * 1.6}px`,
                    background: `rgba(255,255,255,${0.35 + i * 0.13})`,
                  }} />
                ))}
              </div>
              <p className="text-[11px] text-white/70 font-mono uppercase tracking-[0.16em]">
                xFlow CAPIF · live
              </p>
            </div>

            {/* Tile: counter chips — cream */}
            <div className="card-cream rounded-lg p-5 col-span-2 lg:col-span-1">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-display text-[32px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>7</p>
                  <p className="eyebrow mt-1">APIs</p>
                </div>
                <div>
                  <p className="font-display text-[32px] leading-none tracking-[-0.04em] text-accent-coral" style={{ fontWeight: 800, color: 'var(--accent-coral)' }}>3</p>
                  <p className="eyebrow mt-1">Cores</p>
                </div>
                <div>
                  <p className="font-display text-[32px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--accent-violet)' }}>∞</p>
                  <p className="eyebrow mt-1">Calls</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: form hero — pale, sits next to the blue tile */}
          <div className="card-lg p-8 lg:p-10">
            <p className="eyebrow mb-4">Sign in</p>
            <h1 className="font-display text-[clamp(40px,5vw,68px)] leading-[0.92] tracking-[-0.04em] text-ink mb-3" style={{ fontWeight: 800 }}>
              Ship 5G<br />network APIs.
            </h1>
            <p className="text-[14px] text-ink-3 max-w-md">
              Register applications, request operator approval, and reach CAMARA APIs riding on the 5G core.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-4">
              <div>
                <label className="eyebrow block mb-1.5">Username</label>
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
                <label className="eyebrow block mb-1.5">Password</label>
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
                <div className="px-3 py-2 rounded text-[13px]" style={{ background: 'var(--rust-bg)', color: 'var(--rust)' }}>
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting || !username || !password}
                  className="btn-pill"
                >
                  {submitting ? 'Signing in…' : 'Continue →'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint(s => !s)}
                  className="text-[12px] text-ink-3 hover:text-ink transition-colors"
                >
                  {showHint ? 'Hide credentials' : 'Demo credentials?'}
                </button>
              </div>
            </form>

            {showHint && (
              <div className="mt-4 max-w-md card-soft px-4 py-3 text-[12px] font-mono space-y-1">
                <p><span className="text-ink-3">admin:</span> <span className="text-ink">admin / admin123</span></p>
                <p><span className="text-ink-3">dev:&nbsp;&nbsp;</span> <span className="text-ink">dev / dev123</span></p>
              </div>
            )}

            <p className="text-[12px] text-ink-3 mt-8">
              No account? <SignupLink />
            </p>
          </div>
        </div>

        <p className="text-[11px] text-ink-2 mt-4 text-center font-mono uppercase tracking-[0.18em] opacity-70">
          UAEConnect · 5G Network APIs · v3
        </p>
      </div>
    </div>
  );
}

function SignupLinkButton() {
  const configured = process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL;
  const isDev      = process.env.NODE_ENV !== 'production';
  const base       = configured || (isDev ? 'http://localhost:8180' : null);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  if (!base) return <span />;
  const redirect = encodeURIComponent(`${origin || 'http://localhost:3100'}/login`);
  const href = `${base}/realms/camara/protocol/openid-connect/registrations`
             + `?client_id=camara-dashboard-app&response_type=code&redirect_uri=${redirect}`;
  return (
    <a href={href} className="btn-pill text-[13px]" style={{ padding: '8px 18px' }}>
      Sign up
    </a>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center text-ink-3 text-[12px] font-mono uppercase tracking-[0.18em]">
        Loading…
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
