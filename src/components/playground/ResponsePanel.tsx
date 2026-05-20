'use client';

import type { TryResponse } from './types';

interface Props {
  response: TryResponse | null;
  empty?:   string;
}

export default function ResponsePanel({ response, empty }: Props) {
  if (!response) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
        {empty ?? 'Response will appear here after you send a request.'}
      </div>
    );
  }

  const status = response.status ?? 0;
  const ok     = status > 0 && status < 400;
  const text   = typeof response.body === 'string'
    ? response.body
    : JSON.stringify(response.body, null, 2);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-xs">
        <span className="text-slate-300">Response</span>
        <span className={`font-mono px-2 py-0.5 rounded ${
          ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
        }`}>
          {status === 0 ? '—' : `HTTP ${status}`}
        </span>
      </div>
      <pre className="text-slate-100 px-3 py-3 text-xs font-mono leading-relaxed overflow-auto max-h-[28rem]">
        {text}
      </pre>
    </div>
  );
}
