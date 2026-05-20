'use client';

import { useState } from 'react';
import TokenCountdown from './TokenCountdown';

interface Props {
  scope:        string;
  appName:      string;
  token:        string;
  expiresAt:    number | null;       // epoch ms
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
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Access Token</h3>
          <p className="text-xs text-slate-500">
            {appName ? `${appName} → ${scope || '(no scope)'}` : 'Pick an app and scope first'}
          </p>
        </div>
        <button
          onClick={onRequest}
          disabled={status === 'fetching' || !scope}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-50"
        >
          {status === 'fetching' ? 'Requesting…' : token ? 'Renew Token' : 'Request Token'}
        </button>
      </div>

      {status === 'error' && (
        <div className="mt-2 bg-rose-50 border border-rose-200 rounded px-3 py-2 text-xs text-rose-700">
          {errorMessage || 'Token request failed.'}
        </div>
      )}

      {token && (
        <div className="mt-2 rounded-md bg-white border border-indigo-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-100 text-xs">
            <span className="font-medium text-indigo-900">
              Bearer · expires in <TokenCountdown expiresAt={expiresAt} onExpired={onExpired} />
            </span>
            <button
              onClick={copy}
              className="text-indigo-700 hover:text-indigo-900 font-medium"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="px-3 py-2 max-h-24 overflow-auto font-mono text-[11px] text-slate-700 break-all">
            {token}
          </div>
        </div>
      )}
    </div>
  );
}
