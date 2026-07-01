'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';

const ALL_APIS = [
  { id: 'quality-on-demand',           label: 'Quality on Demand',           hint: 'Reserve a guaranteed QoS slot.' },
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
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="card-mint rounded-lg shadow px-10 py-12 text-center">
            <p className="eyebrow mb-3" style={{ color: 'var(--moss)' }}>Registration filed</p>
            <h1 className="font-display text-[44px] tracking-[-0.03em] leading-[0.95]" style={{ fontWeight: 800 }}>
              Thanks.<br />We&apos;ll review shortly.
            </h1>
            <p className="text-[14px] text-ink-2 mt-4 max-w-md mx-auto">
              An operator will approve scoped access. Track progress under <span className="font-mono text-ink">My Registrations</span>.
            </p>
            <div className="card mt-8 px-5 py-4 text-left">
              <p className="eyebrow mb-1">Your invoker ID</p>
              <p className="font-mono text-[14px] text-ink break-all">{result.invoker_id}</p>
            </div>
            <button onClick={() => router.push('/developer/status')} className="btn-pill mt-8">
              View my registrations →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento — 3 tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Onboarding</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              Register a<br />new app.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Submitting as <span className="font-mono text-ink">{email}</span>. An operator
              reviews scope-by-scope before issuing credentials.
            </p>
            <svg className="absolute -right-8 -bottom-8 opacity-10" width="160" height="160" viewBox="0 0 160 160" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1" fill="none">
                <path d="M0 40 L160 40 M0 80 L160 80 M0 120 L160 120" />
                <path d="M40 0 L40 160 M80 0 L80 160 M120 0 L120 160" />
              </g>
            </svg>
          </div>

          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>Selected</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                {form.requested_apis.length}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                of {ALL_APIS.length} APIs
              </p>
            </div>
          </div>

          <div className="card-cream rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4">Review time</p>
            <div>
              <p className="font-display text-[48px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--accent-coral)' }}>
                ~24h
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                typical SLA
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* App details */}
          <section className="card-lg p-8 space-y-5">
            <p className="eyebrow">Section 01</p>
            <h3 className="font-display text-[28px] tracking-[-0.025em] leading-none" style={{ fontWeight: 800 }}>Application.</h3>

            <div>
              <label className="eyebrow block mb-1.5">Name</label>
              <input
                type="text" required
                value={form.invoker_name}
                onChange={e => setForm(f => ({ ...f, invoker_name: e.target.value }))}
                placeholder="my-5g-app"
                className="input"
              />
              <p className="text-[11px] text-ink-3 mt-1.5">3–40 chars, letters/numbers/space/underscore/hyphen.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5">Company</label>
                <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" className="input" />
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Notification URL</label>
                <input type="text" value={form.notification_url} onChange={e => setForm(f => ({ ...f, notification_url: e.target.value }))} className="input font-mono text-[12.5px]" />
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="One line for the operator review queue."
                className="input"
              />
            </div>

            <div>
              <label className="eyebrow block mb-1.5">Use case</label>
              <textarea
                value={form.use_case}
                onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
                rows={3}
                placeholder="What kind of traffic, audience, geography? Helps the operator approve faster."
                className="input"
              />
            </div>
          </section>

          {/* API selector */}
          <section className="card-lg p-8">
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <p className="eyebrow">Section 02</p>
                <h3 className="font-display text-[28px] tracking-[-0.025em] leading-none mt-1" style={{ fontWeight: 800 }}>Requested APIs.</h3>
              </div>
              <span className="text-[11px] text-ink-3 font-mono">
                {form.requested_apis.length} / {ALL_APIS.length}
              </span>
            </div>
            <p className="text-[13px] text-ink-2 mt-3 mb-5">
              Pick everything you might need; the operator can grant a subset.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_APIS.map(api => {
                const on = form.requested_apis.includes(api.id);
                return (
                  <label
                    key={api.id}
                    className={`flex items-start gap-3 p-3.5 rounded-lg cursor-pointer transition-colors ${
                      on
                        ? 'bg-ink text-ink-on-dark'
                        : 'bg-card-soft text-ink-2 hover:bg-card-sunken'
                    }`}
                  >
                    <input
                      type="checkbox" checked={on}
                      onChange={() => toggleApi(api.id)}
                      className="mt-0.5 accent-ink"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] leading-tight">{api.id}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: on ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)' }}>
                        {api.hint}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {error && (
            <div className="px-4 py-3 rounded text-[13px]" style={{ background: 'var(--rust-bg)', color: 'var(--rust)' }}>
              {error}
            </div>
          )}

          <div className="card-lg p-5 flex items-center justify-between gap-3">
            <Link href="/developer/status" className="btn-pill-ghost">Cancel</Link>
            <button
              type="submit"
              disabled={loading || form.requested_apis.length === 0 || !form.invoker_name}
              className="btn-pill"
            >
              {loading ? 'Filing registration…' : 'Submit for approval →'}
            </button>
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
