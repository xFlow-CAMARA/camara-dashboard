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
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TryResponse {
  status?: number;
  body?: unknown;
  error?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending Review', color: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-200' },
  approved:  { label: 'Approved',       color: 'text-green-800',  bg: 'bg-green-50 border-green-200'  },
  rejected:  { label: 'Rejected',       color: 'text-red-800',    bg: 'bg-red-50 border-red-200'      },
  suspended: { label: 'Suspended',      color: 'text-gray-800',   bg: 'bg-gray-50 border-gray-200'    },
};

const SAMPLE_PATHS: Record<string, { method: string; path: string; body?: object }> = {
  'quality-on-demand':          { method: 'GET',  path: '/quality-on-demand/v1/sessions' },
  'location-retrieval':         { method: 'POST', path: '/location-retrieval/v0/retrieve', body: { device: { phoneNumber: '+33699901032' }, maxAge: 60 } },
  'traffic-influence':          { method: 'GET',  path: '/traffic-influence/vwip/traffic-influences' },
  'number-verification':        { method: 'POST', path: '/number-verification/vwip/verify', body: { phoneNumber: '+33699901032' } },
  'device-status':              { method: 'POST', path: '/device-status/v0/roaming', body: { device: { phoneNumber: '+33699901032' } } },
  'device-reachability-status': { method: 'POST', path: '/device-reachability-status/v1/retrieve', body: { device: { phoneNumber: '+33699901032' } } },
  'sim-swap':                   { method: 'POST', path: '/sim-swap/vwip/check', body: { phoneNumber: '+33699901032' } },
};

function InvokerCard({ inv }: { inv: InvokerStatus }) {
  const cfg = STATUS_CONFIG[inv.approval_status] ?? STATUS_CONFIG['pending'];
  const isApproved = inv.approval_status === 'approved';

  // Per-invoker state
  const [credentials, setCredentials] = useState<{ keycloak_client_id?: string; keycloak_secret?: string } | null>(null);
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
    } finally {
      setCredLoading(false);
    }
  };

  const getToken = async () => {
    if (!credentials?.keycloak_client_id || !credentials?.keycloak_secret) return;
    setTokenLoading(true);
    setToken(null);
    try {
      const r = await fetch('/api/developer/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:     credentials.keycloak_client_id,
          client_secret: credentials.keycloak_secret,
          scope:         selectedScope,
        }),
      });
      const data = await r.json();
      setToken(data);
      if (data.access_token) {
        const s = SAMPLE_PATHS[selectedScope];
        if (s) {
          setTryPath(s.path);
          setTryMethod(s.method);
          setTryBody(JSON.stringify(s.body ?? {}, null, 2));
        }
      }
    } finally {
      setTokenLoading(false);
    }
  };

  const callApi = async () => {
    if (!tryPath || !token?.access_token) return;
    setTryLoading(true);
    setTryResult(null);
    try {
      let parsedBody: unknown = {};
      try { parsedBody = tryBody ? JSON.parse(tryBody) : {}; } catch {}
      const r = await fetch('/api/developer/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: tryPath, method: tryMethod, token: token.access_token, body: parsedBody }),
      });
      const data = await r.json();
      setTryResult(data);
    } finally {
      setTryLoading(false);
    }
  };

  return (
    <div className={`border rounded-lg p-5 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-lg text-gray-900">{inv.invoker_name}</h3>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${cfg.color} ${cfg.bg}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-mono">{inv.invoker_id}</p>
      <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(inv.submitted_at).toLocaleString()}</p>

      {inv.approval_status === 'rejected' && inv.rejection_reason && (
        <p className="mt-2 text-sm text-red-700">Reason: {inv.rejection_reason}</p>
      )}

      {isApproved && (
        <div className="mt-4 space-y-4">
          {/* Granted scopes */}
          {inv.scopes_approved && inv.scopes_approved.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Granted API access:</p>
              <div className="flex flex-wrap gap-1">
                {inv.scopes_approved.map(s => (
                  <span key={s} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Show credentials */}
          {!credentials ? (
            <button
              onClick={loadCreds}
              disabled={credLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {credLoading ? 'Loading…' : 'Show Client Credentials'}
            </button>
          ) : (
            <div className="bg-white border rounded p-3 space-y-2">
              <p className="text-xs text-gray-500">Client ID</p>
              <p className="font-mono text-sm text-gray-900 break-all">{credentials.keycloak_client_id}</p>
              <p className="text-xs text-gray-500 mt-2">Client Secret</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-gray-900 break-all flex-1">
                  {showSecret ? credentials.keycloak_secret : '•'.repeat(40)}
                </p>
                <button onClick={() => setShowSecret(s => !s)} className="text-xs text-blue-600 hover:underline">
                  {showSecret ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => credentials.keycloak_secret && navigator.clipboard.writeText(credentials.keycloak_secret)}
                  className="text-xs text-blue-600 hover:underline"
                >Copy</button>
              </div>
            </div>
          )}

          {/* Step 2: Get token */}
          {credentials && (
            <div className="bg-white border rounded p-4 space-y-3">
              <h4 className="font-semibold text-gray-800 text-sm">Step 2 — Get an access token</h4>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={selectedScope}
                    onChange={e => setSelectedScope(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {(inv.scopes_approved ?? []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={getToken}
                  disabled={tokenLoading || !selectedScope}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {tokenLoading ? 'Requesting…' : 'Request Token'}
                </button>
              </div>
              {token && (
                <div className={`rounded border p-2 text-xs ${token.access_token ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {token.access_token ? (
                    <>
                      <p className="font-medium text-green-800 mb-1">
                        Token issued (expires in {token.expires_in}s)
                      </p>
                      <div className="bg-white rounded p-2 font-mono break-all text-gray-800 max-h-24 overflow-auto">
                        {token.access_token}
                      </div>
                    </>
                  ) : (
                    <p className="text-red-700">{token.error_description || token.error || 'Token request failed'}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Try API */}
          {token?.access_token && (
            <div className="bg-white border rounded p-4 space-y-3">
              <h4 className="font-semibold text-gray-800 text-sm">Step 3 — Call the API through Kong</h4>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <select value={tryMethod} onChange={e => setTryMethod(e.target.value)} className="border rounded px-2 py-2 text-sm w-24">
                  <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                </select>
                <input
                  type="text"
                  value={tryPath}
                  onChange={e => setTryPath(e.target.value)}
                  placeholder="/quality-on-demand/v1/sessions"
                  className="border rounded px-3 py-2 text-sm font-mono"
                />
              </div>
              {tryMethod !== 'GET' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Request body (JSON)</label>
                  <textarea
                    value={tryBody}
                    onChange={e => setTryBody(e.target.value)}
                    rows={5}
                    className="w-full border rounded px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}
              <button
                onClick={callApi}
                disabled={tryLoading || !tryPath}
                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {tryLoading ? 'Calling…' : 'Send Request'}
              </button>
              {tryResult && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Response: <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                      tryResult.status && tryResult.status < 400 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>HTTP {tryResult.status ?? '—'}</span>
                  </p>
                  <pre className="bg-gray-900 text-gray-100 rounded p-3 text-xs overflow-auto max-h-60">
                    {typeof tryResult.body === 'string' ? tryResult.body : JSON.stringify(tryResult.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') load();
  }, [authStatus, load]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Registrations</h1>
            <p className="text-gray-600 mt-1">
              Apps registered under <span className="font-mono text-gray-800">{session?.user?.email}</span>.
              Use the workflow on each card to fetch a token and call the API.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
            <Link href="/developer/register" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">
              + Register New App
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : invokers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500 mb-4">You haven&apos;t registered any apps yet.</p>
            <Link href="/developer/register" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
              Register your first app
            </Link>
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

export default function DeveloperStatusPage() {
  return (
    <AuthGuard>
      <DeveloperStatusPageInner />
    </AuthGuard>
  );
}
