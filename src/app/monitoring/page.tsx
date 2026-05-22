'use client';

import Layout from '@/components/Layout';
import MonitoringPanel from '@/components/MonitoringPanel';

export default function MonitoringPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mb-2">Telemetry</p>
          <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.025em]">
            Monitoring{' '}
            <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80, 'WONK' 1" }}>
              dashboard
            </span>
          </h1>
          <p className="text-[13px] text-ink-3 mt-2 max-w-md">
            Real-time metrics and analytics for the 5G core network.
          </p>
        </div>

        <MonitoringPanel />
      </div>
    </Layout>
  );
}
