'use client';

import { useCallback, useEffect, useState } from 'react';

interface Session {
  _id?:       string;
  sessionId?: string;
  operation?: string;
  createdAt?: string;
  response?:  Record<string, unknown>;
  request?:   Record<string, unknown>;
}

interface Props {
  scope:        string;          // e.g. 'quality-on-demand'
  onPickSessionId: (id: string) => void;
}

export default function RecentSessions({ scope, onPickSessionId }: Props) {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/developer/sessions/${scope}`, { cache: 'no-store' });
      const data = await r.json();
      setItems(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between bg-slate-50 border-b">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">Recent calls</span>
        <button
          onClick={load}
          className="text-[11px] text-slate-500 hover:text-slate-800"
          disabled={loading}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="p-3 text-xs text-slate-400 italic">No recent calls for this scope.</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-72 overflow-auto">
          {items.slice(0, 20).map((s, i) => {
            const id   = s.sessionId ?? s._id ?? `row-${i}`;
            const time = s.createdAt ? new Date(s.createdAt).toLocaleString() : '';
            const op   = s.operation ?? 'CALL';
            const idShown = (s.sessionId ?? '').slice(0, 8) || '—';
            return (
              <li key={`${id}-${i}`}>
                <button
                  onClick={() => s.sessionId && onPickSessionId(s.sessionId)}
                  disabled={!s.sessionId}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {op}
                    </span>
                    <span className="text-xs font-mono text-slate-800 truncate">{idShown}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
