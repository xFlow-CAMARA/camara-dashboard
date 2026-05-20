'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

interface AuditEntry {
  action: string;
  invoker_id: string;
  actor: string;
  timestamp: string;
  detail: Record<string, unknown>;
}

const ACTION_BADGE: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  revoked:   'bg-gray-100 text-gray-700',
  offboarded:'bg-orange-100 text-orange-800',
};

function AdminAuditPageInner() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Governance Audit Log</h1>
            <p className="text-gray-600 text-sm mt-1">Immutable record of all approval actions</p>
          </div>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-lg border">
            No audit events yet
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Invoker</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ACTION_BADGE[e.action] ?? 'bg-gray-100'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{e.invoker_id}</td>
                    <td className="px-4 py-3 text-gray-600">{e.actor}</td>
                    <td className="px-4 py-3">
                      {Object.keys(e.detail).length > 0 && (
                        <button
                          onClick={() => setExpanded(expanded === `${i}` ? null : `${i}`)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {expanded === `${i}` ? 'Hide' : 'Show'}
                        </button>
                      )}
                      {expanded === `${i}` && (
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2 max-w-xs overflow-auto">
                          {JSON.stringify(e.detail, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function AdminAuditPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminAuditPageInner />
    </AuthGuard>
  );
}
