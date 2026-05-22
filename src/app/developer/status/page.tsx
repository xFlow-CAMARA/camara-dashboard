'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import SignalIndicator from '@/components/SignalIndicator';

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

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  approving: 'Approving…',
  rotating: 'Rotating…',
};

function pillClass(status: string) {
  switch (status) {
    case 'pending':   return 'pill pill-pending';
    case 'approved':  return 'pill pill-approved';
    case 'rejected':  return 'pill pill-rejected';
    case 'suspended': return 'pill pill-suspended';
    case 'approving':
    case 'rotating':  return 'pill pill-transient';
    default:          return 'pill pill-suspended';
  }
}

function InvokerCard({ inv }: { inv: InvokerStatus }) {
  const { data: session } = useSession();
  const myEmail = session?.user?.email ?? '';
  const isApproved = inv.approval_status === 'approved';

  const [credentials, setCredentials] = useState<{
    keycloak_client_id?: string; keycloak_secret?: string;
    previous_reveal?: { at: string; actor: string } | null;
  } | null>(null);
  const [showSecret, setShowSecret]   = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState((inv.scopes_approved ?? [])[0] ?? '');
  const [token, setToken]             = useState<TokenResponse | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tryPath, setTryPath]         = useState('');
  const [tryMethod, setTryMethod]     = useState('GET');
  const [tryBody, setTryBody]         = useState('{}');
  const [tryLoading, setTryLoading]   = useState(false);
  const [tryResult, setTryResult]     = useState<TryResponse | null>(null);

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
    <article className="surface-lg overflow-hidden">
      {/* Card header — title + status, breathing room */}
      <header className="flex items-start justify-between px-7 pt-7 pb-5 gap-6">
        <div className="min-w-0">
          <h3 className="font-display text-[22px] tracking-[-0.015em] text-ink truncate">{inv.invoker_name}</h3>
          <p className="font-mono text-[11px] text-ink-3 mt-1 truncate">{inv.invoker_id}</p>
          <p className="text-[12px] text-ink-3 mt-2">
            Submitted <span className="font-mono">{new Date(inv.submitted_at).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SignalIndicator status={inv.approval_status as never} size={32} />
          <span className={pillClass(inv.approval_status)}>{STATUS_LABEL[inv.approval_status] ?? inv.approval_status}</span>
        </div>
      </header>

      {inv.approval_status === 'rejected' && inv.rejection_reason && (
        <div className="mx-7 mb-6 px-4 py-3 rounded-sm bg-rust-bg border border-rust/20">
          <p className="text-[11px] uppercase tracking-[0.18em] text-rust mb-1">Reason for rejection</p>
          <p className="text-[14px] text-ink-2">{inv.rejection_reason}</p>
        </div>
      )}

      {isApproved && (
        <div className="px-7 pb-7 space-y-6">
          {/* Scope chips */}
          {inv.scopes_approved && inv.scopes_approved.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-2">Granted access</p>
              <div className="flex flex-wrap gap-1.5">
                {inv.scopes_approved.map(s => (
                  <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-sage-50 text-sage-900 font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Credentials block */}
          <div>
            {!credentials ? (
              <button onClick={loadCreds} disabled={credLoading} className="btn-ghost">
                {credLoading ? 'Loading…' : 'Reveal client credentials'}
              </button>
            ) : (
              <div className="surface p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-1">Client ID</p>
                  <p className="font-mono text-[13px] text-ink break-all">{credentials.keycloak_client_id}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-1">Client Secret</p>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-[13px] text-ink break-all flex-1">
                      {showSecret ? credentials.keycloak_secret : '•'.repeat(36)}
                    </p>
                    <button onClick={() => setShowSecret(s => !s)} className="text-[11px] uppercase tracking-[0.18em] text-sage-700 hover:text-sage-900">
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => credentials.keycloak_secret && navigator.clipboard.writeText(credentials.keycloak_secret)}
                      className="text-[11px] uppercase tracking-[0.18em] text-sage-700 hover:text-sage-900"
                    >Copy</button>
                  </div>
                </div>

                {credentials.previous_reveal && (() => {
                  const when = new Date(credentials.previous_reveal.at).toLocaleString();
                  const who  = credentials.previous_reveal.actor;
                  const isMe = who && myEmail && who === myEmail;
                  return isMe ? (
                    <p className="text-[11px] text-ink-3 mt-2">
                      You last viewed this secret on <span className="font-mono">{when}</span>.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber bg-amber-bg rounded-sm px-3 py-2 mt-2 border border-amber/20">
                      ⚠ Previously revealed to <span className="font-mono">{who}</span> on <span className="font-mono">{when}</span>.
                      If that wasn&apos;t expected, ask the operator to rotate.
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Token step */}
          {credentials && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Step 2 — Mint a token</p>
              <div className="flex gap-2 items-end">
                <select
                  value={selectedScope}
                  onChange={e => setSelectedScope(e.target.value)}
                  className="input flex-1 max-w-xs"
                >
                  {(inv.scopes_approved ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={getToken}
                  disabled={tokenLoading || !selectedScope}
                  className="btn-primary"
                >
                  {tokenLoading ? 'Requesting…' : 'Request token'}
                </button>
              </div>
              {token && (
                <div className={`px-4 py-3 rounded-sm border text-[12px] ${
                  token.access_token
                    ? 'bg-moss-bg border-moss/20 text-ink-2'
                    : 'bg-rust-bg border-rust/20 text-rust'
                }`}>
                  {token.access_token ? (
                    <>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-moss mb-2">
                        Token issued · expires in {token.expires_in}s
                      </p>
                      <div className="font-mono text-[11px] break-all bg-bg-elev rounded p-2 max-h-24 overflow-auto text-ink">
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
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Step 3 — Call the API</p>
              <div className="flex gap-2 items-stretch">
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
                  className="input font-mono text-[12px]"
                />
              )}
              <button onClick={callApi} disabled={tryLoading || !tryPath} className="btn-primary">
                {tryLoading ? 'Calling…' : 'Send request'}
              </button>
              {tryResult && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-1.5">
                    Response · <span className={`font-mono ${tryResult.status && tryResult.status < 400 ? 'text-moss' : 'text-rust'}`}>HTTP {tryResult.status ?? '—'}</span>
                  </p>
                  <pre className="bg-ink text-bg-elev rounded p-4 text-[11px] font-mono leading-relaxed overflow-auto max-h-60">
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page header — editorial style */}
        <div className="flex items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-3">Your applications</p>
            <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.025em]">
              My <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>registrations</span>
            </h1>
            <p className="mt-3 text-[14px] text-ink-2 max-w-md">
              Apps registered under <span className="font-mono text-ink">{session?.user?.email}</span>.
              Reveal credentials, mint tokens, call the network.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="btn-ghost">Refresh</button>
            <Link href="/developer/register" className="btn-primary">+ Register app</Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-ink-3 text-[14px]">Loading…</div>
        ) : invokers.length === 0 ? (
          <div className="surface-lg text-center py-20 px-8">
            <p className="text-5xl mb-4">📡</p>
            <h3 className="font-display text-[22px] mb-2">No applications yet</h3>
            <p className="text-[14px] text-ink-2 mb-6 max-w-md mx-auto">
              Register your first app to get a signed CAPIF identity and request CAMARA API access.
            </p>
            <Link href="/developer/register" className="btn-primary">Register your first app →</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {invokers.map(inv => <InvokerCard key={inv.invoker_id} inv={inv} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function DeveloperStatusPage() {
  return (
    <AuthGuard>
      <DeveloperStatusPageInner />
    </AuthGuard>
  );
}
