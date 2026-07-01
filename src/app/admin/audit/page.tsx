'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

interface AuditEntry {
  action: string;
  invoker_id: string;
  actor: string;
  timestamp: string;
  detail: Record<string, unknown>;
}

type ActionStyle = { dot: string; ring: string; chip: { bg: string; fg: string }; label: string };

const ACTION_STYLES: Record<string, ActionStyle> = {
  submitted:  { dot: 'var(--slate)',  ring: 'var(--slate-bg)',  chip: { bg: 'var(--slate-bg)',  fg: 'var(--slate)'  }, label: 'Submitted'  },
  approved:   { dot: 'var(--moss)',   ring: 'var(--moss-bg)',   chip: { bg: 'var(--moss-bg)',   fg: 'var(--moss)'   }, label: 'Approved'   },
  rejected:   { dot: 'var(--rust)',   ring: 'var(--rust-bg)',   chip: { bg: 'var(--rust-bg)',   fg: 'var(--rust)'   }, label: 'Rejected'   },
  revoked:    { dot: 'var(--ink-3)',  ring: 'var(--bg-sunken)', chip: { bg: 'var(--bg-sunken)', fg: 'var(--ink-2)'  }, label: 'Revoked'    },
  offboarded: { dot: 'var(--amber)',  ring: 'var(--amber-bg)',  chip: { bg: 'var(--amber-bg)',  fg: 'var(--amber)'  }, label: 'Offboarded' },
  rotated:    { dot: 'var(--amber)',  ring: 'var(--amber-bg)',  chip: { bg: 'var(--amber-bg)',  fg: 'var(--amber)'  }, label: 'Rotated'    },
};

const FALLBACK_STYLE: ActionStyle = {
  dot: 'var(--ink-3)', ring: 'var(--bg-sunken)',
  chip: { bg: 'var(--bg-sunken)', fg: 'var(--ink-2)' }, label: '—',
};

function styleFor(action: string): ActionStyle {
  return ACTION_STYLES[action] ?? { ...FALLBACK_STYLE, label: action };
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { date, time };
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function AdminAuditPageInner() {
  const [entries, setEntries]   = useState<AuditEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter]     = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/audit?limit=100');
      const data = await r.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter(e => e.action === filter)),
    [entries, filter],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, { idx: number; entry: AuditEntry }[]>();
    filtered.forEach((entry, idx) => {
      const key = dayKey(entry.timestamp);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ idx, entry });
    });
    return Array.from(buckets.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    entries.forEach(e => { c[e.action] = (c[e.action] ?? 0) + 1; });
    return c;
  }, [entries]);

  const knownActions = Object.keys(ACTION_STYLES).filter(a => (counts[a] ?? 0) > 0);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento — 3 tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Governance</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              Audit<br />trail.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              An immutable record of every approval, rotation, and revocation. The system writes; no one edits.
            </p>
            <div className="mt-6">
              <button onClick={load} className="btn-pill-ghost" disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <svg className="absolute -right-8 -bottom-8 opacity-10" width="160" height="160" viewBox="0 0 160 160" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1" fill="none">
                <circle cx="80" cy="80" r="70" />
                <circle cx="80" cy="80" r="50" />
                <circle cx="80" cy="80" r="30" />
              </g>
            </svg>
          </div>

          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>Events</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                {entries.length}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                {filter === 'all' ? 'total' : filter} logged
              </p>
            </div>
          </div>

          <div className="card-cream rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4">Retention</p>
            <div>
              <p className="font-display text-[48px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--accent-violet)' }}>
                2y
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                TTL · then purged
              </p>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        {entries.length > 0 && (
          <div className="card-lg p-3 flex gap-1.5 flex-wrap items-center">
            <p className="eyebrow px-2">Filter</p>
            <Chip
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="All"
              count={counts.all}
            />
            {knownActions.map(a => (
              <Chip
                key={a}
                active={filter === a}
                onClick={() => setFilter(a)}
                label={ACTION_STYLES[a].label}
                count={counts[a]}
                accent={ACTION_STYLES[a].chip.fg}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="card-lg px-6 py-16 text-center text-[13px] text-ink-3 font-mono uppercase tracking-[0.18em]">
            Loading audit events…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-lg px-10 py-16 text-center">
            <h2 className="font-display text-[28px] tracking-[-0.025em] mb-2" style={{ fontWeight: 800 }}>
              {entries.length === 0 ? 'No events yet.' : 'Nothing matches.'}
            </h2>
            <p className="text-[13px] text-ink-3 max-w-sm mx-auto">
              {entries.length === 0
                ? 'Governance actions will appear here as soon as the first approval is made.'
                : 'No entries match the current filter. Try selecting a different action above.'}
            </p>
          </div>
        ) : (
          <div className="card-lg p-6 lg:p-8 space-y-10">
            {grouped.map(([day, items]) => (
              <section key={day}>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3">{day}</p>
                  <div className="flex-1 h-px" style={{ background: 'var(--hairline)' }} />
                  <span className="text-[11px] font-mono text-ink-3">
                    {items.length} {items.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <ol className="relative space-y-3 pl-6">
                  {/* vertical rail */}
                  <div
                    className="absolute left-[7px] top-2 bottom-2 w-px"
                    style={{ background: 'var(--hairline)' }}
                    aria-hidden
                  />
                  {items.map(({ idx, entry }) => {
                    const st  = styleFor(entry.action);
                    const ts  = formatStamp(entry.timestamp);
                    const has = Object.keys(entry.detail ?? {}).length > 0;
                    const open = expanded === idx;

                    return (
                      <li key={idx} className="relative">
                        {/* timeline dot */}
                        <span
                          className="absolute -left-6 top-4 inline-flex items-center justify-center"
                          aria-hidden
                        >
                          <span
                            className="block w-[15px] h-[15px] rounded-full"
                            style={{ background: st.ring }}
                          />
                          <span
                            className="absolute w-[7px] h-[7px] rounded-full"
                            style={{ background: st.dot }}
                          />
                        </span>

                        <article className="card-soft px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span
                                  className="font-mono text-[10.5px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-pill"
                                  style={{ background: st.chip.bg, color: st.chip.fg }}
                                >
                                  {st.label}
                                </span>
                                <span className="text-[11px] font-mono text-ink-3">
                                  {ts.time}
                                </span>
                              </div>
                              <p className="text-[13px] text-ink-2 leading-snug">
                                <span className="text-ink">{entry.actor}</span>
                                <span className="text-ink-3"> · </span>
                                <span className="font-mono text-[12px] text-ink-2 break-all">
                                  {entry.invoker_id}
                                </span>
                              </p>
                            </div>

                            {has && (
                              <button
                                onClick={() => setExpanded(open ? null : idx)}
                                className="text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink whitespace-nowrap shrink-0"
                              >
                                {open ? '− Hide' : '+ Detail'}
                              </button>
                            )}
                          </div>

                          {open && has && (
                            <pre
                              className="mt-3 px-3 py-2.5 text-[11.5px] font-mono leading-relaxed overflow-auto rounded"
                              style={{ background: 'var(--ink)', color: 'var(--ink-on-dark)', maxHeight: '20rem' }}
                            >
                              {JSON.stringify(entry.detail, null, 2)}
                            </pre>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Chip({
  active, onClick, label, count, accent,
}: { active: boolean; onClick: () => void; label: string; count?: number; accent?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-1.5 text-[13px] rounded-pill transition-colors"
      style={{
        background:  active ? 'var(--ink)'         : 'var(--card)',
        color:       active ? 'var(--ink-on-dark)' : 'var(--ink-2)',
        border:      active ? '1px solid var(--ink)' : '1px solid var(--hairline)',
      }}
    >
      {accent && !active && (
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      )}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className="font-mono text-[10.5px] px-1.5 py-px rounded-pill"
          style={{
            background: active ? 'rgba(255,255,255,0.15)' : 'var(--card-soft)',
            color:      active ? 'var(--ink-on-dark)'     : 'var(--ink-3)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function AdminAuditPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminAuditPageInner />
    </AuthGuard>
  );
}
