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

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoker Approval Queue</h1>
            <p className="text-gray-600 text-sm mt-1">Review and approve developer API access requests</p>
          </div>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : invokers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-lg border">
            No invokers with status &quot;{filter || 'any'}&quot;
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Application</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Requested APIs</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invokers.map(inv => (
                  <tr key={inv.invoker_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.invoker_name}</div>
                      <div className="text-xs text-gray-400">{inv.contact_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.company || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(inv.requested_apis ?? []).slice(0, 3).map(a => (
                          <span key={a} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{a}</span>
                        ))}
                        {(inv.requested_apis ?? []).length > 3 && (
                          <span className="text-xs text-gray-400">+{(inv.requested_apis ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(inv.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[inv.approval_status] ?? 'bg-gray-100'}`}>
                        {inv.approval_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {inv.approval_status === 'pending' && (
                          <>
                            <button onClick={() => openApprove(inv)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
                            <button onClick={() => openReject(inv)}  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Reject</button>
                          </>
                        )}
                        {inv.approval_status === 'approved' && (
                          <>
                            <button onClick={() => openRotate(inv)} className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700">Rotate Secret</button>
                            <button onClick={() => openRevoke(inv)} className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700">Revoke</button>
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

        {/* Pagination controls — visible only when we have any data */}
        {invokers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + invokers.length}
              {hasMore ? '' : ' (end)'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 rounded border bg-white disabled:opacity-40"
              >← Prev</button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
                className="px-3 py-1 rounded border bg-white disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal overlay */}
      {modal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {modal === 'approve' ? 'Approve Invoker' :
               modal === 'reject'  ? 'Reject Invoker'  :
               modal === 'revoke'  ? 'Revoke Access'   :
                                     'Rotate Client Secret'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{selected.invoker_name} — {selected.contact_email}</p>

            {modal === 'approve' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grant access to:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_APIS.map(api => (
                      <label key={api} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${approveScopes.includes(api) ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'}`}>
                        <input type="checkbox" checked={approveScopes.includes(api)} onChange={() => setApproveScopes(s => s.includes(api) ? s.filter(x => x !== api) : [...s, api])} className="accent-green-600" />
                        {api}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved by</label>
                  <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {modal === 'reject' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Rejection reason</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="Please explain why this request is rejected…" />
              </div>
            )}

            {modal === 'revoke' && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">This will delete the Keycloak client. Active tokens will immediately stop working.</p>
                <label className="block text-sm font-medium text-gray-700">Reason for revocation</label>
                <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}

            {modal === 'rotate' && (
              <div className="space-y-3">
                <p className="text-sm text-amber-700">
                  The current Keycloak client secret will be invalidated immediately and a new one issued.
                  Existing access tokens minted with the old secret keep working until their expiry, but
                  no new tokens can be issued with the old secret.
                </p>
                <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                <textarea value={rotateReason} onChange={e => setRotateReason(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. developer lost the secret" />
              </div>
            )}

            {actionResult && (
              <div className={`mt-3 p-3 rounded text-sm ${actionResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {actionResult.msg}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded hover:bg-gray-50">
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
                  className={`px-4 py-2 text-sm text-white rounded font-medium disabled:opacity-50 ${
                    modal === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    modal === 'reject'  ? 'bg-red-600 hover:bg-red-700' :
                    modal === 'revoke'  ? 'bg-gray-700 hover:bg-gray-800' :
                                          'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {actionLoading
                    ? 'Processing…'
                    : modal === 'approve' ? 'Approve & Create Client'
                    : modal === 'reject'  ? 'Reject'
                    : modal === 'revoke'  ? 'Revoke'
                    :                       'Rotate Secret'}
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
