'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import Toolbar        from '@/components/playground/Toolbar';
import TokenPanel     from '@/components/playground/TokenPanel';
import EndpointList   from '@/components/playground/EndpointList';
import RequestPanel   from '@/components/playground/RequestPanel';
import ResponsePanel  from '@/components/playground/ResponsePanel';
import RecentSessions from '@/components/playground/RecentSessions';
import {
  CATALOG, type ApiEndpoint, type HttpMethod, type InvokerSummary, type TryResponse,
} from '@/components/playground/types';

function PlaygroundInner() {
  /* selection */
  const [invokers, setInvokers]                   = useState<InvokerSummary[]>([]);
  const [selectedInvokerId, setSelectedInvokerId] = useState('');
  const [selectedScope,     setSelectedScope]     = useState('');

  /* issued token (from "Request Token" button) */
  const [issuedToken,    setIssuedToken]    = useState('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number | null>(null);
  const [tokenStatus,    setTokenStatus]    = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');
  const [tokenError,     setTokenError]     = useState('');

  /* request (token used here is pasted by the user, not auto-bound) */
  const [bearerToken, setBearerToken] = useState('');
  const [method,      setMethod]      = useState<HttpMethod>('GET');
  const [path,        setPath]        = useState('');
  const [bodyText,    setBodyText]    = useState('{}');
  const [response,    setResponse]    = useState<TryResponse | null>(null);
  const [sending,     setSending]     = useState(false);

  const selectedInvoker = invokers.find(i => i.invoker_id === selectedInvokerId);
  const endpoints       = useMemo(() => CATALOG[selectedScope] ?? [], [selectedScope]);

  /* ── load user's approved invokers ──────────────────────── */
  const loadInvokers = useCallback(async () => {
    const r = await fetch('/api/invokers');
    const data: InvokerSummary[] = await r.json();
    const approved = Array.isArray(data) ? data.filter(i => i.approval_status === 'approved') : [];
    setInvokers(approved);
    if (approved.length && !selectedInvokerId) setSelectedInvokerId(approved[0].invoker_id);
  }, [selectedInvokerId]);
  useEffect(() => { loadInvokers(); }, [loadInvokers]);

  /* invoker change → default scope */
  useEffect(() => {
    if (!selectedInvoker) return;
    setSelectedScope(selectedInvoker.scopes_approved?.[0] ?? '');
  }, [selectedInvokerId, selectedInvoker]);

  /* scope change → preload its first endpoint + invalidate issued token */
  useEffect(() => {
    setResponse(null);
    const eps = CATALOG[selectedScope] ?? [];
    if (eps.length) applyEndpoint(eps[0]);
    // A new scope means the previously-issued token is for the wrong audience
    setIssuedToken('');
    setTokenExpiresAt(null);
    setTokenStatus('idle');
    setTokenError('');
  }, [selectedScope]);

  /* tick expiry */
  useEffect(() => {
    if (!tokenExpiresAt) { setTokenExpiresIn(null); return; }
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((tokenExpiresAt - Date.now()) / 1000));
      setTokenExpiresIn(s);
      if (s === 0) {
        setIssuedToken('');
        setTokenExpiresAt(null);
        setTokenStatus('idle');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [tokenExpiresAt]);

  const applyEndpoint = (e: ApiEndpoint) => {
    setMethod(e.method);
    setPath(e.path);
    setBodyText(JSON.stringify(e.body ?? {}, null, 2));
    setResponse(null);
  };

  const handleRequestToken = async () => {
    if (!selectedInvokerId || !selectedScope) return;
    setTokenStatus('fetching');
    setTokenError('');
    setIssuedToken('');
    try {
      const credR = await fetch(`/api/invokers/${selectedInvokerId}/credentials`);
      const creds = await credR.json();
      if (!credR.ok) {
        setTokenStatus('error');
        setTokenError(creds.error || creds.detail || 'Could not fetch credentials');
        return;
      }

      const tokR = await fetch('/api/developer/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_id:     creds.keycloak_client_id,
          client_secret: creds.keycloak_secret,
          scope:         selectedScope,
        }),
      });
      const data = await tokR.json();
      if (!data.access_token) {
        setTokenStatus('error');
        setTokenError(data.error_description || data.error || 'Token request failed');
        return;
      }

      setIssuedToken(data.access_token);
      setTokenExpiresAt(Date.now() + (data.expires_in ?? 300) * 1000);
      setTokenStatus('ready');
    } catch (e) {
      setTokenStatus('error');
      setTokenError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSend = async () => {
    if (!path || !bearerToken.trim()) return;
    setSending(true);
    setResponse(null);
    try {
      let parsedBody: unknown = {};
      try { parsedBody = bodyText ? JSON.parse(bodyText) : {}; } catch { /* server surfaces JSON errors */ }
      const r = await fetch('/api/developer/try', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ path, method, token: bearerToken.trim(), body: parsedBody }),
      });
      const data = await r.json();
      setResponse(data);
    } finally {
      setSending(false);
    }
  };

  if (invokers.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-4xl mb-3">🛰️</p>
          <h1 className="text-2xl font-bold text-slate-900">Nothing to try yet</h1>
          <p className="text-slate-500 mt-2 mb-6">
            Register an app and have it approved before sending requests.
          </p>
          <Link
            href="/developer/register"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-blue-700"
          >
            Register an app →
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* App + scope selectors (token indicator removed — it's now its own panel) */}
        <Toolbar
          invokers={invokers}
          selectedInvokerId={selectedInvokerId}
          selectedScope={selectedScope}
          tokenStatus={
            tokenStatus === 'ready'    ? 'valid'    :
            tokenStatus === 'fetching' ? 'fetching' :
            tokenStatus === 'error'    ? 'error'    : 'none'
          }
          tokenExpiresIn={tokenExpiresIn}
          onInvokerChange={setSelectedInvokerId}
          onScopeChange={setSelectedScope}
        />

        <TokenPanel
          appName={selectedInvoker?.invoker_name ?? ''}
          scope={selectedScope}
          token={issuedToken}
          expiresIn={tokenExpiresIn}
          status={tokenStatus}
          errorMessage={tokenError}
          onRequest={handleRequestToken}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b">
                Endpoints
              </div>
              <EndpointList
                endpoints={endpoints}
                selectedPath={path}
                selectedMethod={method}
                onPick={applyEndpoint}
              />
            </div>

            <RecentSessions
              scope={selectedScope}
              onPickSessionId={(id) => {
                // Pick "Get by ID" template and swap {sessionId} for the real id
                const tpl = endpoints.find(e => e.path.includes('{sessionId}') && e.method === 'GET');
                if (tpl) {
                  setMethod('GET');
                  setPath(tpl.path.replace('{sessionId}', id));
                  setBodyText('{}');
                  setResponse(null);
                } else {
                  // Fall back: just stuff the id into the current path
                  setPath(prev => prev.replace('{sessionId}', id));
                }
              }}
            />
          </aside>

          <section className="space-y-4 min-w-0">
            <RequestPanel
              method={method}
              path={path}
              bodyText={bodyText}
              bearerToken={bearerToken}
              sending={sending}
              disabled={sending || !path}
              onMethod={setMethod}
              onPath={setPath}
              onBody={setBodyText}
              onBearer={setBearerToken}
              onSend={handleSend}
            />
            <ResponsePanel
              response={response}
              empty={
                !bearerToken
                  ? 'Paste a Bearer token in the request above, then send.'
                  : 'Response will appear here after you send a request.'
              }
            />
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default function PlaygroundPage() {
  return (
    <AuthGuard>
      <PlaygroundInner />
    </AuthGuard>
  );
}
