'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

interface InvokerStatus {
  invoker_id: string;
  invoker_name: string;
  approval_status: string;
  submitted_at: string;
  approved_at?: string;
  rejection_reason?: string;
  scopes_approved?: string[];
  keycloak_client_id?: string;
}

interface TokenResponse {
  access_token?: string; token_type?: string; expires_in?: number;
  error?: string; error_description?: string;
}
interface TryResponse { status?: number; body?: unknown; error?: string; }

const SAMPLE_PATHS: Record<string, { method: string; path: string; body?: object }> = {
  'quality-on-demand':          { method: 'GET',  path: '/quality-on-demand/v1/sessions' },
  'location-retrieval':         { method: 'POST', path: '/location-retrieval/v0/retrieve', body: { device: { phoneNumber: '+33699901032' }, maxAge: 60 } },
  'traffic-influence':          { method: 'GET',  path: '/traffic-influence/vwip/traffic-influences' },
  'number-verification':        { method: 'POST', path: '/number-verification/vwip/verify', body: { phoneNumber: '+33699901032' } },
  'device-status':              { method: 'POST', path: '/device-status/v0/roaming', body: { device: { phoneNumber: '+33699901032' } } },
  'device-reachability-status': { method: 'POST', path: '/device-reachability-status/v1/retrieve', body: { device: { phoneNumber: '+33699901032' } } },
  'sim-swap':                   { method: 'POST', path: '/sim-swap/vwip/check', body: { phoneNumber: '+33699901032' } },
};

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  pending:   { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Pending review' },
  approved:  { bg: 'var(--moss-bg)',  fg: 'var(--moss)',  label: 'Approved' },
  rejected:  { bg: 'var(--rust-bg)',  fg: 'var(--rust)',  label: 'Rejected' },
  suspended: { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: 'Suspended' },
  approving: { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: 'Approving…' },
  rotating:  { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Rotating…' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: status };
  return (
    <span className="status-pill" style={{ background: s.bg, color: s.fg }}>
      <span className="block w-1.5 h-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

function InvokerCard({ inv }: { inv: InvokerStatus }) {
  const { data: session } = useSession();
  const myEmail = session?.user?.email ?? '';
  const isApproved = inv.approval_status === 'approved';

  const [credentials, setCredentials] = useState<{
    keycloak_client_id?: string; keycloak_secret?: string;
    previous_reveal?: { at: string; actor: string } | null;
  } | null>(null);
  const [showSecret,   setShowSecret]   = useState(false);
  const [credLoading,  setCredLoading]  = useState(false);
  const [selectedScope, setSelectedScope] = useState((inv.scopes_approved ?? [])[0] ?? '');
  const [token, setToken]               = useState<TokenResponse | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tryPath,   setTryPath]   = useState('');
  const [tryMethod, setTryMethod] = useState('GET');
  const [tryBody,   setTryBody]   = useState('{}');
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResult,  setTryResult]  = useState<TryResponse | null>(null);

  const loadCreds = async () => {
    setCredLoading(true);
    try {
      const r = await fetch(`/api/invokers/${inv.invoker_id}/credentials`);
      const data = await r.json();
      if (r.ok) setCredentials(data);
    } finally { setCredLoading(false); }
  };

  const getToken = async () => {
    if (!credentials?.keycloak_client_id || !credentials?.keycloak_secret) return;
    setTokenLoading(true); setToken(null);
    try {
      const r = await fetch('/api/developer/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: credentials.keycloak_client_id,
          client_secret: credentials.keycloak_secret,
          scope: selectedScope,
        }),
      });
      const data = await r.json();
      setToken(data);
      if (data.access_token) {
        const s = SAMPLE_PATHS[selectedScope];
        if (s) { setTryPath(s.path); setTryMethod(s.method); setTryBody(JSON.stringify(s.body ?? {}, null, 2)); }
      }
    } finally { setTokenLoading(false); }
  };

  const callApi = async () => {
    if (!tryPath || !token?.access_token) return;
    setTryLoading(true); setTryResult(null);
    try {
      let parsedBody: unknown = {};
      try { parsedBody = tryBody ? JSON.parse(tryBody) : {}; } catch {}
      const r = await fetch('/api/developer/try', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tryPath, method: tryMethod, token: token.access_token, body: parsedBody }),
      });
      setTryResult(await r.json());
    } finally { setTryLoading(false); }
  };

  return (
    <article className="card-lg overflow-hidden">
      <header className="flex items-start justify-between px-7 pt-7 pb-5 gap-6">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Application</p>
          <h3 className="font-display text-[28px] tracking-[-0.025em] text-ink leading-none truncate" style={{ fontWeight: 800 }}>
            {inv.invoker_name}
          </h3>
          <p className="font-mono text-[11px] text-ink-3 mt-2 truncate">{inv.invoker_id}</p>
          <p className="text-[12px] text-ink-3 mt-1">
            Submitted{' '}
            <span className="font-mono text-ink-2">
              {new Date(inv.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </p>
        </div>
        <StatusPill status={inv.approval_status} />
      </header>

      {inv.approval_status === 'rejected' && inv.rejection_reason && (
        <div className="mx-7 mb-7 px-4 py-3 rounded" style={{ background: 'var(--rust-bg)' }}>
          <p className="eyebrow mb-1" style={{ color: 'var(--rust)' }}>Reason for rejection</p>
          <p className="text-[14px]" style={{ color: 'var(--rust)' }}>{inv.rejection_reason}</p>
        </div>
      )}

      {isApproved && (
        <div className="px-7 pb-7 space-y-5">
          {inv.scopes_approved && inv.scopes_approved.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Granted access</p>
              <div className="flex flex-wrap gap-1.5">
                {inv.scopes_approved.map(s => (
                  <span key={s} className="text-[11px] px-2.5 py-1 rounded-pill font-mono"
                    style={{ background: 'var(--ink)', color: 'var(--ink-on-dark)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Credentials */}
          <div>
            <p className="eyebrow mb-2">Step 1 · Credentials</p>
            {!credentials ? (
              <button onClick={loadCreds} disabled={credLoading} className="btn-pill-ghost">
                {credLoading ? 'Loading…' : 'Reveal credentials'}
              </button>
            ) : (
              <div className="card-soft p-4 space-y-3">
                <div>
                  <p className="eyebrow mb-1">Client ID</p>
                  <p className="font-mono text-[13px] text-ink break-all">{credentials.keycloak_client_id}</p>
                </div>
                <div>
                  <p className="eyebrow mb-1">Client Secret</p>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-[13px] text-ink break-all flex-1">
                      {showSecret ? credentials.keycloak_secret : '•'.repeat(36)}
                    </p>
                    <button onClick={() => setShowSecret(s => !s)} className="text-[11px] font-medium text-ink-3 hover:text-ink">
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => credentials.keycloak_secret && navigator.clipboard.writeText(credentials.keycloak_secret)}
                      className="text-[11px] font-medium text-ink-3 hover:text-ink"
                    >Copy</button>
                  </div>
                </div>

                {credentials.previous_reveal && (() => {
                  const when = new Date(credentials.previous_reveal.at).toLocaleString();
                  const who  = credentials.previous_reveal.actor;
                  const isMe = who && myEmail && who === myEmail;
                  return isMe ? (
                    <p className="text-[11px] text-ink-3">
                      You last viewed this secret on <span className="font-mono">{when}</span>.
                    </p>
                  ) : (
                    <p className="text-[11px] px-3 py-2 rounded" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                      ⚠ Previously revealed to <span className="font-mono">{who}</span> on <span className="font-mono">{when}</span>.
                      Ask the operator to rotate if unexpected.
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Token step */}
          {credentials && (
            <div>
              <p className="eyebrow mb-2">Step 2 · Mint a token</p>
              <div className="flex gap-2 items-end">
                <select
                  value={selectedScope}
                  onChange={e => setSelectedScope(e.target.value)}
                  className="input flex-1 max-w-xs"
                >
                  {(inv.scopes_approved ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={getToken} disabled={tokenLoading || !selectedScope} className="btn-pill">
                  {tokenLoading ? 'Requesting…' : 'Request token'}
                </button>
              </div>
              {token && (
                <div className="mt-3 px-4 py-3 rounded text-[12px]"
                  style={{
                    background: token.access_token ? 'var(--moss-bg)' : 'var(--rust-bg)',
                    color: token.access_token ? 'var(--moss)' : 'var(--rust)',
                  }}>
                  {token.access_token ? (
                    <>
                      <p className="eyebrow mb-2" style={{ color: 'var(--moss)' }}>
                        Token issued · expires in {token.expires_in}s
                      </p>
                      <div className="font-mono text-[11px] break-all card p-2 max-h-24 overflow-auto" style={{ color: 'var(--ink)' }}>
                        {token.access_token}
                      </div>
                    </>
                  ) : (token.error_description || token.error || 'Token request failed')}
                </div>
              )}
            </div>
          )}

          {/* Try-API step */}
          {token?.access_token && (
            <div>
              <p className="eyebrow mb-2">Step 3 · Call the API</p>
              <div className="flex gap-2 items-stretch mb-2">
                <select value={tryMethod} onChange={e => setTryMethod(e.target.value)} className="input w-24 font-mono">
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
                <input type="text" value={tryPath} onChange={e => setTryPath(e.target.value)} className="input flex-1 font-mono" />
              </div>
              {tryMethod !== 'GET' && (
                <textarea
                  value={tryBody}
                  onChange={e => setTryBody(e.target.value)}
                  rows={5}
                  className="input font-mono text-[12px] mb-2"
                />
              )}
              <button onClick={callApi} disabled={tryLoading || !tryPath} className="btn-pill">
                {tryLoading ? 'Calling…' : 'Send request'}
              </button>
              {tryResult && (
                <div className="mt-3">
                  <p className="eyebrow mb-1.5">
                    Response · <span className="font-mono" style={{
                      color: tryResult.status && tryResult.status < 400 ? 'var(--moss)' : 'var(--rust)',
                    }}>HTTP {tryResult.status ?? '—'}</span>
                  </p>
                  <pre className="rounded p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-60"
                    style={{ background: 'var(--ink)', color: 'var(--ink-on-dark)' }}>
                    {typeof tryResult.body === 'string' ? tryResult.body : JSON.stringify(tryResult.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function DeveloperStatusPageInner() {
  const { data: session, status: authStatus } = useSession();
  const [invokers, setInvokers] = useState<InvokerStatus[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/invokers');
      const data = await r.json();
      setInvokers(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authStatus === 'authenticated') load(); }, [authStatus, load]);

  const counts = {
    total:    invokers.length,
    approved: invokers.filter(i => i.approval_status === 'approved').length,
    pending:  invokers.filter(i => i.approval_status === 'pending').length,
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento — title + stats tiles, multi-color */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Your applications</p>
            <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              My<br />registrations.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Apps registered under <span className="font-mono text-ink">{session?.user?.email}</span>.
              Reveal credentials, mint tokens, call the network.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/developer/register" className="btn-pill">+ Register app</Link>
              <button onClick={load} className="btn-pill-ghost">Refresh</button>
            </div>
            {/* decorative arc */}
            <svg className="absolute -right-12 -bottom-12 opacity-10" width="180" height="180" viewBox="0 0 180 180" aria-hidden>
              <circle cx="90" cy="90" r="80" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
              <circle cx="90" cy="90" r="60" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
              <circle cx="90" cy="90" r="40" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Total"    value={counts.total}    color="blue" />
            <StatTile label="Approved" value={counts.approved} color="mint" />
            <StatTile label="Pending"  value={counts.pending}  color="cream" />
          </div>
        </div>

        {loading ? (
          <div className="card-lg py-16 text-center text-ink-3 text-[13px] font-mono uppercase tracking-[0.18em]">
            Loading…
          </div>
        ) : invokers.length === 0 ? (
          <div className="card-lg py-16 px-8 text-center">
            <p className="font-display text-[28px] tracking-[-0.025em] mb-2" style={{ fontWeight: 800 }}>
              No applications yet.
            </p>
            <p className="text-[14px] text-ink-3 max-w-md mx-auto mb-6">
              Register your first app to get a signed CAPIF identity and request CAMARA API access.
            </p>
            <Link href="/developer/register" className="btn-pill">Register your first app →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invokers.map(inv => <InvokerCard key={inv.invoker_id} inv={inv} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatTile({
  label, value, color = 'white',
}: {
  label: string; value: number; color?: 'white' | 'blue' | 'mint' | 'cream' | 'dark';
}) {
  const cls = {
    white: 'card-lg',
    blue:  'card-blue rounded-lg shadow',
    mint:  'card-mint rounded-lg shadow',
    cream: 'card-cream rounded-lg shadow',
    dark:  'card-dark',
  }[color];
  const valueColor = color === 'dark' ? 'var(--ink-on-dark)' : 'var(--ink)';
  return (
    <div className={`${cls} p-5 flex flex-col justify-between`}>
      <p className="font-display text-[44px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: valueColor }}>{value}</p>
      <p className="eyebrow mt-3" style={{ color: color === 'dark' ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)' }}>
        {label}
      </p>
    </div>
  );
}

export default function DeveloperStatusPage() {
  return (
    <AuthGuard>
      <DeveloperStatusPageInner />
    </AuthGuard>
  );
}
