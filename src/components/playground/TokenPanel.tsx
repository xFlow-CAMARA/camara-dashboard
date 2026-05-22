'use client';

import { useState } from 'react';
import TokenCountdown from './TokenCountdown';

interface Props {
  scope:        string;
  appName:      string;
  token:        string;
  expiresAt:    number | null;
  status:       'idle' | 'fetching' | 'ready' | 'error';
  errorMessage: string;
  onRequest:    () => void;
  onExpired?:   () => void;
}

export default function TokenPanel({
  scope, appName, token, expiresAt, status, errorMessage, onRequest, onExpired,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };

  return (
    <section
      className="surface-lg overflow-hidden"
      style={{ background: 'linear-gradient(180deg, var(--sage-50), var(--bg-elev) 70%)' }}
    >
      <div className="px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Access token</p>
          <p className="text-[14px] text-ink-2 mt-1">
            {appName ? <><span className="text-ink font-medium">{appName}</span> <span className="text-ink-3">→</span> <span className="font-mono text-ink-2">{scope || '(no scope)'}</span></> : 'Pick an app and scope above'}
          </p>
        </div>
        <button
          onClick={onRequest}
          disabled={status === 'fetching' || !scope}
          className="btn-primary"
        >
          {status === 'fetching' ? 'Requesting…' : token ? 'Renew' : 'Request token'}
        </button>
      </div>

      {status === 'error' && (
        <div className="mx-6 mb-6 px-4 py-3 rounded-sm bg-rust-bg border border-rust/20 text-[13px] text-rust">
          {errorMessage || 'Token request failed.'}
        </div>
      )}

      {token && (
        <div className="mx-6 mb-6 rounded surface overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-sunken border-b border-hairline">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
              Bearer · expires in <TokenCountdown expiresAt={expiresAt} onExpired={onExpired} />
            </p>
            <button onClick={copy} className="text-[11px] uppercase tracking-[0.18em] text-sage-700 hover:text-sage-900">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="px-3 py-2.5 max-h-28 overflow-auto font-mono text-[11px] text-ink break-all">
            {token}
          </div>
        </div>
      )}
    </section>
  );
}
