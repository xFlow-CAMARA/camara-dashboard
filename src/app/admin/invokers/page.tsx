'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import SignalIndicator from '@/components/SignalIndicator';

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

const PILL_CLASS: Record<string, string> = {
  pending:   'pill pill-pending',
  approved:  'pill pill-approved',
  rejected:  'pill pill-rejected',
  suspended: 'pill pill-suspended',
  approving: 'pill pill-transient',
  rotating:  'pill pill-transient',
};

function AdminInvokersPageInner() {
  // Pagination + filter state live in the URL so refresh / shared link
  // / browser-back all preserve the admin's place in the queue.
  const router  = useRouter();
  const sParams = useSearchParams();
  const filter  = sParams.get('status') ?? 'pending';
  const page    = Math.max(0, parseInt(sParams.get('page') ?? '0', 10));
  const PAGE_SIZE = 25;

  const setFilter = (newStatus: string) => {
    const qs = new URLSearchParams(sParams.toString());
    if (newStatus) qs.set('status', newStatus); else qs.delete('status');
    qs.delete('page');           // reset to first page on filter change
    router.replace(`?${qs.toString()}`, { scroll: false });
  };
  const setPage = (next: number) => {
    const qs = new URLSearchParams(sParams.toString());
    qs.set('page', String(Math.max(0, next)));
    router.replace(`?${qs.toString()}`, { scroll: false });
  };

  const [invokers, setInvokers] = useState<Invoker[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoker | null>(null);

  // Approval modal state
  const [approveScopes, setApproveScopes] = useState<string[]>([]);
  const [approvedBy, setApprovedBy] = useState('admin');
  const [rejectReason, setRejectReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [rotateReason, setRotateReason] = useState('');
  const [modal, setModal] = useState<'approve' | 'reject' | 'revoke' | 'rotate' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * PAGE_SIZE;
      const qs   = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
      if (filter) qs.set('status', filter);
      const r = await fetch(`/api/admin/invokers?${qs.toString()}`);
      const data = await r.json();
      // Backend returns { items, has_more, skip, limit }. Fall back to the
      // legacy array shape for backward compatibility during deploy.
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

  const openApprove = (inv: Invoker) => {
    setSelected(inv);
    setApproveScopes(inv.requested_apis ?? []);
    setActionResult(null);
    setModal('approve');
  };
  const openReject = (inv: Invoker) => { setSelected(inv); setRejectReason(''); setActionResult(null); setModal('reject'); };
  const openRevoke = (inv: Invoker) => { setSelected(inv); setRevokeReason(''); setActionResult(null); setModal('revoke'); };
  const openRotate = (inv: Invoker) => { setSelected(inv); setRotateReason(''); setActionResult(null); setModal('rotate'); };

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

      // The approve response no longer carries the secret (it would otherwise
      // sit in HTTP access logs forever). Fetch it via /credentials, which
      // records an audit row for the reveal.
      let secretLine = '';
      try {
        const credR = await fetch(`/api/invokers/${selected.invoker_id}/credentials`);
        const cred  = await credR.json();
        if (credR.ok && cred.keycloak_secret) secretLine = `\nSecret: ${cred.keycloak_secret}`;
      } catch { /* secret can still be fetched later from developer status */ }

      setActionResult({
        ok: true,
        msg: `Approved. Keycloak client: ${data.keycloak_client_id}${secretLine}`,
      });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setActionLoading(false);
    }
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
    } finally {
      setActionLoading(false);
    }
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
    } finally {
      setActionLoading(false);
    }
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
      setActionResult({
        ok: true,
        msg: `Secret rotated. New value (copy now — won't be shown again here):\n${data.keycloak_secret}`,
      });
      load();
    } catch (e: unknown) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-2">Operator</p>
            <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.025em]">
              Approval <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>queue</span>
            </h1>
            <p className="text-[14px] text-ink-2 mt-2 max-w-xl">Review developer registrations, grant per-API scopes, and manage rotation.</p>
          </div>
          <button onClick={load} className="btn-ghost">Refresh</button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[12px] uppercase tracking-[0.1em] transition-colors ${
                filter === s
                  ? 'bg-sage-700 text-bg-elev'
                  : 'bg-bg-elev border border-hairline text-ink-2 hover:border-hairline-2'
              }`}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-ink-3 text-[14px]">Loading…</div>
        ) : invokers.length === 0 ? (
          <div className="surface text-center py-16 text-[14px] text-ink-3">
            No invokers with status <span className="font-mono">{filter || 'any'}</span>
          </div>
        ) : (
          <div className="surface-lg overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-bg-sunken border-b border-hairline">
                <tr className="text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  <th className="text-left px-5 py-3 font-medium">Application</th>
                  <th className="text-left px-5 py-3 font-medium">Company</th>
                  <th className="text-left px-5 py-3 font-medium">Requested APIs</th>
                  <th className="text-left px-5 py-3 font-medium">Submitted</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {invokers.map(inv => (
                  <tr key={inv.invoker_id} className="hover:bg-bg-sunken transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink">{inv.invoker_name}</div>
                      <div className="font-mono text-[11px] text-ink-3 mt-0.5">{inv.contact_email}</div>
                    </td>
                    <td className="px-5 py-4 text-ink-2">{inv.company || <span className="text-ink-3">—</span>}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(inv.requested_apis ?? []).slice(0, 3).map(a => (
                          <span key={a} className="text-[11px] font-mono bg-sage-50 text-sage-900 px-1.5 py-0.5 rounded-sm">{a}</span>
                        ))}
                        {(inv.requested_apis ?? []).length > 3 && (
                          <span className="text-[11px] text-ink-3">+{(inv.requested_apis ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-3 font-mono text-[12px]">
                      {new Date(inv.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <SignalIndicator status={inv.approval_status as never} size={26} />
                        <span className={PILL_CLASS[inv.approval_status] ?? 'pill pill-suspended'}>{inv.approval_status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        {inv.approval_status === 'pending' && (
                          <>
                            <button onClick={() => openApprove(inv)} className="text-[11px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-sm bg-moss text-bg-elev hover:opacity-90">Approve</button>
                            <button onClick={() => openReject(inv)}  className="text-[11px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-sm bg-rust-bg text-rust hover:bg-rust hover:text-bg-elev transition-colors">Reject</button>
                          </>
                        )}
                        {inv.approval_status === 'approved' && (
                          <>
                            <button onClick={() => openRotate(inv)} className="text-[11px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-sm bg-amber-bg text-amber hover:bg-amber hover:text-bg-elev transition-colors">Rotate</button>
                            <button onClick={() => openRevoke(inv)} className="text-[11px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-sm bg-slate-bg text-slate hover:bg-slate hover:text-bg-elev transition-colors">Revoke</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {invokers.length > 0 && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-ink-3 font-mono">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + invokers.length}
              {hasMore ? '' : ' · end'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 0} className="btn-ghost disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={!hasMore} className="btn-ghost disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal overlay */}
      {modal && selected && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="surface-lg max-w-lg w-full p-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-2">
              {modal === 'approve' ? 'Approval' :
               modal === 'reject'  ? 'Rejection'  :
               modal === 'revoke'  ? 'Revocation'   :
                                     'Secret rotation'}
            </p>
            <h2 className="font-display text-[24px] tracking-[-0.015em] text-ink mb-1">
              {modal === 'approve' ? 'Grant access to this invoker' :
               modal === 'reject'  ? 'Reject this registration' :
               modal === 'revoke'  ? 'Revoke an active invoker' :
                                     'Rotate the client secret'}
            </h2>
            <p className="text-[13px] text-ink-2 mb-5">
              <span className="font-medium text-ink">{selected.invoker_name}</span>
              <span className="text-ink-3 mx-1.5">·</span>
              <span className="font-mono text-[12px]">{selected.contact_email}</span>
            </p>

            {modal === 'approve' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-2">Grant access to</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_APIS.map(api => {
                      const on = approveScopes.includes(api);
                      return (
                        <label
                          key={api}
                          className={`flex items-center gap-2 p-2 rounded-sm border cursor-pointer text-[12.5px] transition-all ${
                            on ? 'bg-sage-50 border-sage-300' : 'bg-bg-elev border-hairline hover:border-hairline-2'
                          }`}
                        >
                          <input
                            type="checkbox" checked={on}
                            onChange={() => setApproveScopes(s => s.includes(api) ? s.filter(x => x !== api) : [...s, api])}
                            className="accent-sage-500"
                          />
                          <span className="font-mono">{api}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-1.5">Approved by</label>
                  <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="input" />
                </div>
              </div>
            )}

            {modal === 'reject' && (
              <div className="space-y-3">
                <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-3">Rejection reason</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="input" placeholder="Explain why this request is rejected…" />
              </div>
            )}

            {modal === 'revoke' && (
              <div className="space-y-3">
                <p className="text-[13px] text-rust bg-rust-bg border border-rust/20 rounded-sm px-3 py-2.5">
                  This deletes the Keycloak client. Active tokens stop working immediately at Kong.
                </p>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-3">Reason for revocation</label>
                <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={2} className="input" />
              </div>
            )}

            {modal === 'rotate' && (
              <div className="space-y-3">
                <p className="text-[13px] text-amber bg-amber-bg border border-amber/20 rounded-sm px-3 py-2.5">
                  The current Keycloak secret is invalidated immediately. Existing tokens keep working until they expire; new tokens require the new secret.
                </p>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-ink-3">Reason (optional)</label>
                <textarea value={rotateReason} onChange={e => setRotateReason(e.target.value)} rows={2} className="input" placeholder="e.g. developer lost the secret" />
              </div>
            )}

            {actionResult && (
              <div className={`mt-4 px-3 py-2.5 rounded-sm text-[12.5px] whitespace-pre-wrap ${
                actionResult.ok ? 'bg-moss-bg text-ink-2 border border-moss/20' : 'bg-rust-bg text-rust border border-rust/20'
              }`}>
                {actionResult.msg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="btn-ghost">
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
                  className="btn-primary"
                  style={
                    modal === 'reject'  ? { background: 'var(--rust)' } :
                    modal === 'rotate'  ? { background: 'var(--amber)' } :
                    modal === 'revoke'  ? { background: 'var(--slate)' } : undefined
                  }
                >
                  {actionLoading
                    ? 'Processing…'
                    : modal === 'approve' ? 'Approve & Create Client'
                    : modal === 'reject'  ? 'Reject registration'
                    : modal === 'revoke'  ? 'Revoke access'
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
