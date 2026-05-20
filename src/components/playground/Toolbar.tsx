'use client';

import TokenCountdown from './TokenCountdown';
import type { InvokerSummary } from './types';

interface Props {
  invokers:          InvokerSummary[];
  selectedInvokerId: string;
  selectedScope:     string;
  tokenStatus:       'none' | 'fetching' | 'valid' | 'error';
  tokenExpiresAt?:   number | null;
  onInvokerChange:   (id: string) => void;
  onScopeChange:     (scope: string) => void;
}

export default function Toolbar({
  invokers, selectedInvokerId, selectedScope,
  tokenStatus, tokenExpiresAt,
  onInvokerChange, onScopeChange,
}: Props) {
  const selectedInvoker = invokers.find(i => i.invoker_id === selectedInvokerId);
  const scopes = selectedInvoker?.scopes_approved ?? [];

  const tokenDot =
    tokenStatus === 'valid'    ? 'bg-emerald-500'  :
    tokenStatus === 'fetching' ? 'bg-amber-400 animate-pulse' :
    tokenStatus === 'error'    ? 'bg-rose-500'     :
                                 'bg-slate-300';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedInvokerId}
          onChange={e => onInvokerChange(e.target.value)}
          className="bg-white border border-slate-300 rounded-full px-4 py-1.5 text-sm font-medium text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {invokers.map(inv => (
            <option key={inv.invoker_id} value={inv.invoker_id}>{inv.invoker_name}</option>
          ))}
        </select>

        <span className="text-slate-400">/</span>

        <select
          value={selectedScope}
          onChange={e => onScopeChange(e.target.value)}
          disabled={scopes.length === 0}
          className="bg-white border border-slate-300 rounded-full px-4 py-1.5 text-sm font-medium text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        >
          {scopes.length === 0
            ? <option>No scopes granted</option>
            : scopes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className={`inline-block w-2 h-2 rounded-full ${tokenDot}`} />
        {tokenStatus === 'valid'    && <span>Token active · <TokenCountdown expiresAt={tokenExpiresAt ?? null} /></span>}
        {tokenStatus === 'fetching' && <span>Fetching token…</span>}
        {tokenStatus === 'error'    && <span className="text-rose-600">Token error</span>}
        {tokenStatus === 'none'     && <span>No token yet</span>}
      </div>
    </div>
  );
}
