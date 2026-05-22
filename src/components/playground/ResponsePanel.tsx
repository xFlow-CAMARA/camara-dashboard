'use client';

import type { TryResponse } from './types';

interface Props {
  response: TryResponse | null;
  empty?:   string;
}

export default function ResponsePanel({ response, empty }: Props) {
  if (!response) {
    return (
      <div
        className="rounded-lg border border-dashed text-center py-10 text-[12px] text-ink-3"
        style={{ borderColor: 'var(--hairline-2)', background: 'var(--bg-sunken)' }}
      >
        {empty ?? 'Response will appear here after you send a request.'}
      </div>
    );
  }

  const status = response.status ?? 0;
  const ok     = status > 0 && status < 400;
  const text   = typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2);

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-sunken border-b border-hairline">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Response</p>
        <span
          className="font-mono text-[11px] px-2 py-0.5 rounded-sm"
          style={{
            background: ok ? 'var(--moss-bg)' : 'var(--rust-bg)',
            color:      ok ? 'var(--moss)'   : 'var(--rust)',
          }}
        >
          {status === 0 ? '—' : `HTTP ${status}`}
        </span>
      </div>
      <pre
        className="px-4 py-3 text-[12px] font-mono leading-relaxed overflow-auto max-h-[28rem]"
        style={{ background: 'var(--ink)', color: '#E8E6E1' }}
      >
        {text}
      </pre>
    </div>
  );
}
