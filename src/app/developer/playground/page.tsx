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

  const onTokenExpired = useCallback(() => {
    setIssuedToken('');
    setTokenExpiresAt(null);
    setTokenStatus('idle');
  }, []);

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
        <div className="max-w-2xl mx-auto surface-lg px-10 py-16 text-center">
          <p className="text-4xl mb-4">🛰️</p>
          <h1 className="font-display text-[32px] tracking-[-0.02em] mb-3">Nothing to try yet</h1>
          <p className="text-[14px] text-ink-2 mb-8 max-w-md mx-auto">
            Register an app and have it approved before sending requests through the gateway.
          </p>
          <Link href="/developer/register" className="btn-primary">Register an app →</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-2">Sandbox</p>
          <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.025em]">
            API <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>playground</span>
          </h1>
        </div>

        <Toolbar
          invokers={invokers}
          selectedInvokerId={selectedInvokerId}
          selectedScope={selectedScope}
          tokenStatus={
            tokenStatus === 'ready'    ? 'valid'    :
            tokenStatus === 'fetching' ? 'fetching' :
            tokenStatus === 'error'    ? 'error'    : 'none'
          }
          tokenExpiresAt={tokenExpiresAt}
          onInvokerChange={setSelectedInvokerId}
          onScopeChange={setSelectedScope}
        />

        <TokenPanel
          appName={selectedInvoker?.invoker_name ?? ''}
          scope={selectedScope}
          token={issuedToken}
          expiresAt={tokenExpiresAt}
          status={tokenStatus}
          errorMessage={tokenError}
          onRequest={handleRequestToken}
          onExpired={onTokenExpired}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6">
          <aside className="space-y-4">
            <div className="surface overflow-hidden">
              <div className="px-3 py-2.5 text-[10px] uppercase tracking-[0.22em] text-ink-3 bg-bg-sunken border-b border-hairline">
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
