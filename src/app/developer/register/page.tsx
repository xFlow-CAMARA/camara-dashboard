'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

const ALL_APIS = [
  { id: 'quality-on-demand',           label: 'Quality on Demand',           hint: 'Reserve a guaranteed QoS slot.'  },
  { id: 'location-retrieval',          label: 'Location Retrieval',          hint: 'Fetch a device’s cell location.' },
  { id: 'traffic-influence',           label: 'Traffic Influence',           hint: 'Steer traffic toward an MEC zone.' },
  { id: 'number-verification',         label: 'Number Verification',         hint: 'Confirm phone-number ownership.' },
  { id: 'device-status',               label: 'Device Status',               hint: 'Roaming / connectivity flags.' },
  { id: 'device-reachability-status',  label: 'Device Reachability',         hint: 'Is the device currently reachable?' },
  { id: 'sim-swap',                    label: 'SIM Swap',                    hint: 'Detect recent SIM card swaps.' },
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
  const [result, setResult]   = useState<RegistrationResult | null>(null);
  const [error, setError]     = useState('');

  const toggleApi = (id: string) => {
    setForm(f => ({
      ...f,
      requested_apis: f.requested_apis.includes(id)
        ? f.requested_apis.filter(a => a !== id)
        : [...f.requested_apis, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
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
    } finally { setLoading(false); }
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="surface-lg px-10 py-12 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-moss mb-3">Registration filed</p>
            <h1 className="font-display text-[34px] tracking-[-0.02em] mb-3">Thanks. We&apos;ll review shortly.</h1>
            <p className="text-[14px] text-ink-2 mb-8 max-w-md mx-auto">
              An operator will approve scoped access to the requested CAMARA APIs.
              Check progress under <em>My Registrations</em>.
            </p>
            <div className="surface px-5 py-4 text-left mb-8">
              <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3 mb-1">Your invoker ID</p>
              <p className="font-mono text-[14px] text-ink break-all">{result.invoker_id}</p>
            </div>
            <button onClick={() => router.push('/developer/status')} className="btn-primary">
              View my registrations →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-3">Onboarding</p>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.025em]">
            Register a <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>new</span> application
          </h1>
          <p className="mt-3 text-[14px] text-ink-2 max-w-xl">
            Submitting as <span className="font-mono text-ink">{email}</span>. An operator
            reviews scope-by-scope before issuing credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* App details card */}
          <section className="surface-lg p-8 space-y-5">
            <h3 className="font-display text-[20px] tracking-[-0.01em]">Application</h3>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">
                Name <span className="text-rust normal-case tracking-normal">·</span>
              </label>
              <input
                type="text" required
                value={form.invoker_name}
                onChange={e => setForm(f => ({ ...f, invoker_name: e.target.value }))}
                placeholder="my-5g-app"
                className="input"
              />
              <p className="text-[11px] text-ink-3 mt-1.5">3–40 chars, letters/numbers/space/underscore/hyphen.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Company</label>
                <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" className="input" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Notification URL</label>
                <input type="text" value={form.notification_url} onChange={e => setForm(f => ({ ...f, notification_url: e.target.value }))} className="input font-mono text-[12.5px]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="One line for the operator review queue."
                className="input"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-1.5">Use case</label>
              <textarea
                value={form.use_case}
                onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
                rows={3}
                placeholder="What kind of traffic, audience, geography? Helps the operator approve faster."
                className="input"
              />
            </div>
          </section>

          {/* API selector — distinctive grid with hints */}
          <section className="surface-lg p-8">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-display text-[20px] tracking-[-0.01em]">Requested APIs</h3>
              <span className="text-[11px] text-ink-3">
                {form.requested_apis.length} of {ALL_APIS.length} selected
              </span>
            </div>
            <p className="text-[13px] text-ink-2 mb-5">
              Pick everything you might need; the operator can grant a subset.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_APIS.map(api => {
                const on = form.requested_apis.includes(api.id);
                return (
                  <label
                    key={api.id}
                    className={`flex items-start gap-3 p-3.5 rounded cursor-pointer transition-all border ${
                      on
                        ? 'bg-sage-50 border-sage-300'
                        : 'bg-bg-elev border-hairline hover:border-hairline'
                    }`}
                    style={on ? { boxShadow: '0 0 0 3px var(--sage-100)' } : undefined}
                  >
                    <input
                      type="checkbox" checked={on}
                      onChange={() => toggleApi(api.id)}
                      className="mt-0.5 accent-sage-500"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] text-ink leading-tight">{api.id}</p>
                      <p className="text-[11px] text-ink-3 mt-0.5">{api.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {error && (
            <div className="px-4 py-3 rounded-sm bg-rust-bg border border-rust/20 text-[13px] text-rust">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || form.requested_apis.length === 0 || !form.invoker_name}
              className="btn-primary"
            >
              {loading ? 'Filing registration…' : 'Submit for approval →'}
            </button>
            <Link href="/developer/status" className="btn-ghost">Cancel</Link>
          </div>
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
