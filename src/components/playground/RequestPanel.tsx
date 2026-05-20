'use client';

import { type HttpMethod, METHOD_COLORS } from './types';

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

export default function RequestPanel({
  method, path, bodyText, bearerToken, sending, disabled,
  onMethod, onPath, onBody, onBearer, onSend,
}: Props) {
  const hasToken = bearerToken.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Bearer token input — paste-or-empty */}
      <div className={`rounded-lg border bg-white transition-colors ${
        hasToken ? 'border-emerald-300' : 'border-slate-300'
      }`}>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200">
          <label className="text-xs font-medium text-slate-600">
            Authorization · Bearer
          </label>
          <div className="flex items-center gap-3">
            {hasToken && (
              <span className="text-[11px] text-emerald-700">
                ● {bearerToken.length} chars
              </span>
            )}
            {hasToken && (
              <button
                onClick={() => onBearer('')}
                className="text-[11px] text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={bearerToken}
          onChange={e => onBearer(e.target.value)}
          rows={2}
          placeholder="Paste the token from above here…"
          spellCheck={false}
          className="w-full px-3 py-2 text-xs font-mono text-slate-700 resize-y focus:outline-none rounded-b-lg"
        />
      </div>

      {/* URL bar */}
      <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-slate-300 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300 bg-white">
        <select
          value={method}
          onChange={e => onMethod(e.target.value as HttpMethod)}
          className={`appearance-none px-3 py-2 text-xs font-mono font-semibold tracking-wider border-r border-slate-300 focus:outline-none ${METHOD_COLORS[method]}`}
        >
          <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
        </select>
        <input
          type="text"
          value={path}
          onChange={e => onPath(e.target.value)}
          placeholder="/quality-on-demand/v1/sessions"
          spellCheck={false}
          className="flex-1 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none"
        />
        <button
          onClick={onSend}
          disabled={disabled || !hasToken}
          title={!hasToken ? 'Paste a Bearer token first' : ''}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>

      {/* Body editor */}
      {method !== 'GET' && (
        <div className="rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-xs text-slate-300">
            <span>Body · application/json</span>
            <span className="text-slate-500">{bodyText.length} chars</span>
          </div>
          <textarea
            value={bodyText}
            onChange={e => onBody(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full bg-slate-900 text-slate-100 px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none resize-y"
          />
        </div>
      )}
    </div>
  );
}
