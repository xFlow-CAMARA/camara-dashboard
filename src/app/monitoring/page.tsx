'use client';

import Layout from '@/components/Layout';
import MonitoringPanel from '@/components/MonitoringPanel';

export default function MonitoringPage() {
  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Telemetry</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              Monitoring<br />dashboard.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Real-time metrics and analytics for the 5G core network. Streamed via Grafana, proxied through this origin.
            </p>
            <svg className="absolute -right-8 -bottom-8 opacity-10" width="160" height="160" viewBox="0 0 160 160" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1" fill="none">
                <path d="M0 100 L40 60 L80 80 L120 30 L160 50" />
                <path d="M0 130 L40 100 L80 110 L120 70 L160 90" />
              </g>
            </svg>
          </div>

          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>Status</p>
            <div>
              <p className="font-display text-[48px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                Live
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                streaming · 5s
              </p>
            </div>
          </div>

          <div className="card-mint rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4">Source</p>
            <div>
              <p className="font-display text-[40px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--moss)' }}>
                Grafana
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                via /grafana
              </p>
            </div>
          </div>
        </div>

        <MonitoringPanel />
      </div>
    </Layout>
  );
}
