'use client';

import { type HttpMethod } from './types';

interface Props {
  method:      HttpMethod;
  path:        string;
  bodyText:    string;
  bearerToken: string;
  sending:     boolean;
  disabled:    boolean;
  onMethod:    (m: HttpMethod) => void;
  onPath:      (p: string) => void;
  onBody:      (b: string) => void;
  onBearer:    (t: string) => void;
  onSend:      () => void;
}

const METHOD_BG: Record<HttpMethod, string> = {
  GET:    'var(--moss-bg)',
  POST:   'var(--sage-100)',
  PUT:    'var(--amber-bg)',
  DELETE: 'var(--rust-bg)',
};
const METHOD_FG: Record<HttpMethod, string> = {
  GET:    'var(--moss)',
  POST:   'var(--sage-700)',
  PUT:    'var(--amber)',
  DELETE: 'var(--rust)',
};

export default function RequestPanel({
  method, path, bodyText, bearerToken, sending, disabled,
  onMethod, onPath, onBody, onBearer, onSend,
}: Props) {
  const hasToken = bearerToken.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Bearer token */}
      <div className={`surface overflow-hidden transition-colors ${hasToken ? 'ring-1 ring-sage-300' : ''}`}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-hairline">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Authorization · Bearer</p>
          <div className="flex items-center gap-3 text-[11px]">
            {hasToken && <span className="text-moss font-mono">● {bearerToken.length} chars</span>}
            {hasToken && (
              <button onClick={() => onBearer('')} className="uppercase tracking-[0.18em] text-ink-3 hover:text-ink">
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={bearerToken}
          onChange={e => onBearer(e.target.value)}
          rows={2}
          placeholder="Paste your access token here…"
          spellCheck={false}
          className="w-full px-3 py-2 text-[11.5px] font-mono text-ink resize-y focus:outline-none bg-bg-elev"
        />
      </div>

      {/* URL bar — method + path + send all in one rounded shell */}
      <div className="surface overflow-hidden flex items-stretch focus-within:ring-2 focus-within:ring-sage-100 focus-within:border-sage-500 transition-colors">
        <select
          value={method}
          onChange={e => onMethod(e.target.value as HttpMethod)}
          className="px-3 py-2.5 text-[11px] font-mono font-semibold tracking-wider border-r border-hairline focus:outline-none"
          style={{ background: METHOD_BG[method], color: METHOD_FG[method] }}
        >
          <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
        </select>
        <input
          type="text"
          value={path}
          onChange={e => onPath(e.target.value)}
          placeholder="/quality-on-demand/v1/sessions"
          spellCheck={false}
          className="flex-1 px-3 py-2.5 text-[13px] font-mono text-ink focus:outline-none bg-bg-elev"
        />
        <button
          onClick={onSend}
          disabled={disabled || !hasToken}
          title={!hasToken ? 'Paste a Bearer token first' : ''}
          className="px-6 py-2.5 bg-sage-700 hover:bg-sage-900 text-bg-elev text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '…' : 'Send →'}
        </button>
      </div>

      {/* Body editor — dark; obviously "code" */}
      {method !== 'GET' && (
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-sunken border-b border-hairline">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Body · application/json</p>
            <span className="text-[11px] text-ink-3 font-mono">{bodyText.length} chars</span>
          </div>
          <textarea
            value={bodyText}
            onChange={e => onBody(e.target.value)}
            rows={9}
            spellCheck={false}
            className="w-full px-3 py-2.5 text-[12px] font-mono leading-relaxed focus:outline-none resize-y"
            style={{ background: 'var(--ink)', color: '#E8E6E1' }}
          />
        </div>
      )}
    </div>
  );
}
