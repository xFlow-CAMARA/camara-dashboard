'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

const ALL_APIS = [
  'quality-on-demand',
  'location-retrieval',
  'traffic-influence',
  'number-verification',
  'device-status',
  'device-reachability-status',
  'sim-swap',
];

interface Invoker {
  invoker_id: string;
  invoker_name: string;
  approval_status: string;
  submitted_at: string;
  contact_email?: string;
  company?: string;
  requested_apis?: string[];
  scopes_approved?: string[];
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  pending:   { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Pending'   },
  approved:  { bg: 'var(--moss-bg)',  fg: 'var(--moss)',  label: 'Approved'  },
  rejected:  { bg: 'var(--rust-bg)',  fg: 'var(--rust)',  label: 'Rejected'  },
  suspended: { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: 'Suspended' },
  approving: { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: 'Approving' },
  rotating:  { bg: 'var(--amber-bg)', fg: 'var(--amber)', label: 'Rotating'  },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'var(--slate-bg)', fg: 'var(--slate)', label: status };
  return (
    <span className="status-pill" style={{ background: s.bg, color: s.fg }}>
      <span className="block w-1.5 h-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

function FilterChip({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-pill text-[13px] transition-colors ${
        active
          ? 'bg-ink text-ink-on-dark'
          : 'bg-card text-ink-2 hover:bg-card-soft border border-hairline'
      }`}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span
          className="text-[10px] font-mono px-1.5 py-px rounded-pill"
          style={{
            background: active ? 'rgba(255,255,255,0.15)' : 'var(--card-soft)',
            color: active ? 'var(--ink-on-dark)' : 'var(--ink-3)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function AdminInvokersPageInner() {
  const router  = useRouter();
  const sParams = useSearchParams();
  const filter  = sParams.get('status') ?? 'pending';
  const page    = Math.max(0, parseInt(sParams.get('page') ?? '0', 10));
  const PAGE_SIZE = 25;

  const setFilter = (newStatus: string) => {
    const qs = new URLSearchParams(sParams.toString());
    if (newStatus) qs.set('status', newStatus); else qs.delete('status');
    qs.delete('page');
    router.replace(`?${qs.toString()}`, { scroll: false });
  };
  const setPage = (next: number) => {
    const qs = new URLSearchParams(sParams.toString());
    qs.set('page', String(Math.max(0, next)));
    router.replace(`?${qs.toString()}`, { scroll: false });
  };

  const [invokers, setInvokers] = useState<Invoker[]>([]);
  const [hasMore,  setHasMore]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Invoker | null>(null);

  const [approveScopes, setApproveScopes] = useState<string[]>([]);
  const [approvedBy,    setApprovedBy]    = useState('admin');
  const [rejectReason,  setRejectReason]  = useState('');
  const [revokeReason,  setRevokeReason]  = useState('');
  const [rotateReason,  setRotateReason]  = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult,  setActionResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal,         setModal]         = useState<'approve' | 'reject' | 'revoke' | 'rotate' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * PAGE_SIZE;
      const qs   = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
      if (filter) qs.set('status', filter);
      const r = await fetch(`/api/admin/invokers?${qs.toString()}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setInvokers(data); setHasMore(false);
      } else {
        setInvokers(Array.isArray(data.items) ? data.items : []);
        setHasMore(!!data.has_more);
      }
    } catch {
      setInvokers([]); setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const openApprove = (inv: Invoker) => { setSelected(inv); setApproveScopes(inv.requested_apis ?? []); setActionResult(null); setModal('approve'); };
  const openReject  = (inv: Invoker) => { setSelected(inv); setRejectReason('');  setActionResult(null); setModal('reject'); };
  const openRevoke  = (inv: Invoker) => { setSelected(inv); setRevokeReason('');  setActionResult(null); setModal('revoke'); };
  const openRotate  = (inv: Invoker) => { setSelected(inv); setRotateReason('');  setActionResult(null); setModal('rotate'); };

  const doApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/invokers/${selected.invoker_id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes_approved: approveScopes, approved_by: approvedBy }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || r.statusText);
      let secretLine = '';
      try {
        const credR = await fetch(`/api/invokers/${selected.invoker_id}/credentials`);
        const cred  = await credR.json();
        if (credR.ok && cred.keycloak_secret) secretLine = `\nSecret: ${cred.keycloak_secret}`;
      } catch {}
      setActionResult({ ok: true, msg: `Approved. Keycloak client: ${data.keycloak_client_id}${secretLine}` });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally { setActionLoading(false); }
  };

  const doReject = async () => {
    if (!selected || !rejectReason) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/invokers/${selected.invoker_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectReason, rejected_by: approvedBy }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || r.statusText);
      setActionResult({ ok: true, msg: 'Registration rejected.' });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally { setActionLoading(false); }
  };

  const doRevoke = async () => {
    if (!selected || !revokeReason) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/invokers/${selected.invoker_id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason, revoked_by: approvedBy }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || r.statusText);
      setActionResult({ ok: true, msg: 'Invoker suspended. Keycloak client deleted.' });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally { setActionLoading(false); }
  };

  const doRotate = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/invokers/${selected.invoker_id}/rotate-secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rotateReason || null, rotated_by: approvedBy }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || r.statusText);
      setActionResult({ ok: true, msg: `Secret rotated. New value (copy now — won't be shown again here):\n${data.keycloak_secret}` });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally { setActionLoading(false); }
  };

  return (
    <Layout>
      <div className="space-y-4">

        {/* Hero bento — 3-tile mix */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          {/* Main hero (white) */}
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Governance</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              Approval<br />queue.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Review developer registrations, grant per-API scopes, rotate or revoke active credentials.
            </p>
            <div className="mt-6">
              <button onClick={load} className="btn-pill-ghost">Refresh</button>
            </div>
            {/* decorative grid */}
            <svg className="absolute -right-8 -bottom-8 opacity-10" width="160" height="160" viewBox="0 0 160 160" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1" fill="none">
                <path d="M0 40 L160 40 M0 80 L160 80 M0 120 L160 120" />
                <path d="M40 0 L40 160 M80 0 L80 160 M120 0 L120 160" />
              </g>
            </svg>
          </div>

          {/* Counter (pale blue) */}
          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>On page</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                {invokers.length}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                {filter || 'all'} · pg {page + 1}
              </p>
            </div>
          </div>

          {/* Signal (dark gradient) */}
          <div className="card-gradient p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Activity</p>
            <div className="flex items-end gap-1.5 h-12">
              {[3, 6, 9, 13, 18].map((h, i) => (
                <span key={i} className="block w-2.5 rounded-sm" style={{
                  height: `${h * 1.6}px`,
                  background: `rgba(255,255,255,${0.3 + i * 0.14})`,
                }} />
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-mono text-white/60 mt-3">
              5G core · live
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="card-lg p-3 flex gap-1.5 flex-wrap items-center">
          <p className="eyebrow px-2">Filter</p>
          {[
            { v: '',           l: 'All'       },
            { v: 'pending',    l: 'Pending'   },
            { v: 'approved',   l: 'Approved'  },
            { v: 'rejected',   l: 'Rejected'  },
            { v: 'suspended',  l: 'Suspended' },
          ].map(s => (
            <FilterChip key={s.v} label={s.l} active={filter === s.v} onClick={() => setFilter(s.v)} />
          ))}
        </div>

        {/* Table card */}
        <div className="card-lg overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-ink-3 text-[13px] font-mono uppercase tracking-[0.18em]">Loading…</div>
          ) : invokers.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-[24px] tracking-[-0.025em] mb-1" style={{ fontWeight: 800 }}>
                Nothing here.
              </p>
              <p className="text-[13px] text-ink-3">
                No invokers with status <span className="font-mono">{filter || 'any'}</span>
              </p>
            </div>
          ) : (
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-6 py-4 eyebrow">Application</th>
                  <th className="text-left px-6 py-4 eyebrow">Company</th>
                  <th className="text-left px-6 py-4 eyebrow">APIs</th>
                  <th className="text-left px-6 py-4 eyebrow">Submitted</th>
                  <th className="text-left px-6 py-4 eyebrow">Status</th>
                  <th className="text-right px-6 py-4 eyebrow">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {invokers.map(inv => (
                  <tr key={inv.invoker_id} className="hover:bg-card-soft/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-ink font-medium">{inv.invoker_name}</div>
                      <div className="font-mono text-[11px] text-ink-3 mt-0.5 truncate max-w-[200px]">
                        {inv.contact_email || inv.invoker_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-2">{inv.company || <span className="text-ink-3">—</span>}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(inv.requested_apis ?? []).slice(0, 3).map(a => (
                          <span key={a} className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--card-soft)', color: 'var(--ink-2)' }}>
                            {a}
                          </span>
                        ))}
                        {(inv.requested_apis ?? []).length > 3 && (
                          <span className="text-[11px] text-ink-3">+{(inv.requested_apis ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-3 font-mono text-[12px]">
                      {new Date(inv.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={inv.approval_status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end">
                        {inv.approval_status === 'pending' && (
                          <>
                            <button onClick={() => openApprove(inv)} className="text-[11px] px-3 py-1.5 rounded-pill bg-ink text-ink-on-dark hover:opacity-90">
                              Approve
                            </button>
                            <button onClick={() => openReject(inv)} className="text-[11px] px-3 py-1.5 rounded-pill border border-hairline-2 text-ink-2 hover:bg-card-soft">
                              Reject
                            </button>
                          </>
                        )}
                        {inv.approval_status === 'approved' && (
                          <>
                            <button onClick={() => openRotate(inv)} className="text-[11px] px-3 py-1.5 rounded-pill border border-hairline-2 text-ink-2 hover:bg-card-soft">
                              Rotate
                            </button>
                            <button onClick={() => openRevoke(inv)} className="text-[11px] px-3 py-1.5 rounded-pill border border-hairline-2 text-ink-2 hover:bg-card-soft">
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {invokers.length > 0 && (
          <div className="card-lg px-5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-3 font-mono">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + invokers.length}
              {hasMore ? '' : ' · end'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 0} className="btn-pill-ghost text-[12px] disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={!hasMore}  className="btn-pill-ghost text-[12px] disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && selected && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-lg max-w-lg w-full p-7">
            <p className="eyebrow mb-3">
              {modal === 'approve' ? 'Approval' :
               modal === 'reject'  ? 'Rejection' :
               modal === 'revoke'  ? 'Revocation' :
                                     'Secret rotation'}
            </p>
            <h2 className="font-display text-[28px] tracking-[-0.025em] leading-tight mb-2" style={{ fontWeight: 800 }}>
              {modal === 'approve' ? 'Grant access.' :
               modal === 'reject'  ? 'Reject request.' :
               modal === 'revoke'  ? 'Revoke access.' :
                                     'Rotate secret.'}
            </h2>
            <p className="text-[13px] text-ink-2 mb-6">
              <span className="font-medium text-ink">{selected.invoker_name}</span>
              <span className="text-ink-3 mx-1.5">·</span>
              <span className="font-mono text-[12px]">{selected.contact_email}</span>
            </p>

            {modal === 'approve' && (
              <div className="space-y-4">
                <div>
                  <p className="eyebrow mb-2">Grant access to</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_APIS.map(api => {
                      const on = approveScopes.includes(api);
                      return (
                        <label
                          key={api}
                          className={`flex items-center gap-2 p-2.5 rounded cursor-pointer text-[12.5px] transition-colors ${
                            on
                              ? 'bg-ink text-ink-on-dark'
                              : 'bg-card-soft text-ink-2 hover:bg-card-sunken'
                          }`}
                        >
                          <input
                            type="checkbox" checked={on}
                            onChange={() => setApproveScopes(s => s.includes(api) ? s.filter(x => x !== api) : [...s, api])}
                            className="accent-ink"
                          />
                          <span className="font-mono">{api}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-1.5">Approved by</p>
                  <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="input" />
                </div>
              </div>
            )}

            {modal === 'reject' && (
              <div className="space-y-3">
                <p className="eyebrow">Rejection reason</p>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="input" placeholder="Why is this request rejected?" />
              </div>
            )}

            {modal === 'revoke' && (
              <div className="space-y-3">
                <p className="text-[13px] px-3 py-2.5 rounded" style={{ background: 'var(--rust-bg)', color: 'var(--rust)' }}>
                  This deletes the Keycloak client. Active tokens stop working immediately at Kong.
                </p>
                <p className="eyebrow">Reason</p>
                <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={2} className="input" />
              </div>
            )}

            {modal === 'rotate' && (
              <div className="space-y-3">
                <p className="text-[13px] px-3 py-2.5 rounded" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
                  The current Keycloak secret is invalidated immediately. Existing tokens keep working until they expire; new tokens require the new secret.
                </p>
                <p className="eyebrow">Reason (optional)</p>
                <textarea value={rotateReason} onChange={e => setRotateReason(e.target.value)} rows={2} className="input" placeholder="e.g. developer lost the secret" />
              </div>
            )}

            {actionResult && (
              <div className="mt-5 px-4 py-3 rounded text-[12.5px] whitespace-pre-wrap"
                style={{
                  background: actionResult.ok ? 'var(--moss-bg)' : 'var(--rust-bg)',
                  color: actionResult.ok ? 'var(--moss)' : 'var(--rust)',
                }}>
                {actionResult.msg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="btn-pill-ghost text-[13px]">
                {actionResult?.ok ? 'Close' : 'Cancel'}
              </button>
              {!actionResult?.ok && (
                <button
                  onClick={
                    modal === 'approve' ? doApprove :
                    modal === 'reject'  ? doReject  :
                    modal === 'revoke'  ? doRevoke  :
                                          doRotate
                  }
                  disabled={
                    actionLoading ||
                    (modal === 'approve' && approveScopes.length === 0) ||
                    (modal === 'reject' && !rejectReason) ||
                    (modal === 'revoke' && !revokeReason)
                  }
                  className="btn-pill"
                  style={
                    modal === 'reject'  ? { background: 'var(--rust)' } :
                    modal === 'rotate'  ? { background: 'var(--amber)' } :
                    modal === 'revoke'  ? { background: 'var(--slate)' } : undefined
                  }
                >
                  {actionLoading
                    ? 'Processing…'
                    : modal === 'approve' ? 'Approve & create client'
                    : modal === 'reject'  ? 'Reject'
                    : modal === 'revoke'  ? 'Revoke'
                    :                       'Rotate secret'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function AdminInvokersPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminInvokersPageInner />
    </AuthGuard>
  );
}
