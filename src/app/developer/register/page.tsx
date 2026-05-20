'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

interface RegistrationResult {
  invoker_id: string;
  approval_status: string;
  message: string;
}

function DeveloperRegisterPageInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const email = session?.user?.email ?? '';

  const [form, setForm] = useState({
    invoker_name: '',
    description: '',
    company: '',
    use_case: '',
    notification_url: 'http://localhost/capif-callback',
    requested_apis: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState('');

  const toggleApi = (api: string) => {
    setForm(f => ({
      ...f,
      requested_apis: f.requested_apis.includes(api)
        ? f.requested_apis.filter(a => a !== api)
        : [...f.requested_apis, api],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch('/api/invokers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || data.error || r.statusText);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 mb-2">Registration Submitted</h2>
            <p className="text-green-700 mb-4">{result.message}</p>
            <div className="bg-white rounded border p-4 font-mono text-sm mb-4">
              <p className="text-gray-500 text-xs mb-1">Your Invoker ID:</p>
              <p className="font-bold text-gray-900 break-all">{result.invoker_id}</p>
            </div>
            <button
              onClick={() => router.push('/developer/status')}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
            >
              View My Registrations →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Register a new application</h1>
          <p className="text-gray-600 mt-1">
            Submitting as <span className="font-mono text-gray-800">{email || '...'}</span>.
            An operator will review and approve your request.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Application Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.invoker_name}
                onChange={e => setForm(f => ({ ...f, invoker_name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="my-5g-app"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notification URL</label>
                <input
                  type="text"
                  value={form.notification_url}
                  onChange={e => setForm(f => ({ ...f, notification_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of your application"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Use Case</label>
              <textarea
                value={form.use_case}
                onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How will you use the CAMARA APIs?"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-800 mb-3">
              Requested APIs <span className="text-red-500">*</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ALL_APIS.map(api => (
                <label
                  key={api}
                  className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                    form.requested_apis.includes(api)
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.requested_apis.includes(api)}
                    onChange={() => toggleApi(api)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-800">{api}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || form.requested_apis.length === 0 || !form.invoker_name}
            className="w-full bg-blue-600 text-white py-3 rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting…' : 'Submit Registration Request'}
          </button>
        </form>
      </div>
    </Layout>
  );
}

export default function DeveloperRegisterPage() {
  return (
    <AuthGuard>
      <DeveloperRegisterPageInner />
    </AuthGuard>
  );
}
