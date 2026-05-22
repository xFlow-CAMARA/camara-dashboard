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

  const dotColor =
    tokenStatus === 'valid'    ? 'var(--moss)'  :
    tokenStatus === 'fetching' ? 'var(--amber)' :
    tokenStatus === 'error'    ? 'var(--rust)'  :
                                 'var(--ink-3)';

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mr-2">App</span>
        <select
          value={selectedInvokerId}
          onChange={e => onInvokerChange(e.target.value)}
          className="bg-bg-elev border border-hairline rounded-full px-4 py-1.5 text-[13px] text-ink hover:border-hairline-2 focus:outline-none focus:border-sage-500"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          {invokers.map(inv => <option key={inv.invoker_id} value={inv.invoker_id}>{inv.invoker_name}</option>)}
        </select>

        <span className="mx-1 text-ink-3">·</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mr-2">API</span>
        <select
          value={selectedScope}
          onChange={e => onScopeChange(e.target.value)}
          disabled={scopes.length === 0}
          className="bg-bg-elev border border-hairline rounded-full px-4 py-1.5 text-[13px] font-mono text-ink hover:border-hairline-2 focus:outline-none focus:border-sage-500 disabled:opacity-50"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          {scopes.length === 0 ? <option>No scopes granted</option>
            : scopes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
        {tokenStatus === 'valid'    && <>Token live · <TokenCountdown expiresAt={tokenExpiresAt ?? null} /></>}
        {tokenStatus === 'fetching' && 'Fetching…'}
        {tokenStatus === 'error'    && <span className="text-rust">Token error</span>}
        {tokenStatus === 'none'     && 'No token'}
      </div>
    </div>
  );
}
