'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import CoresStatusPanel from '@/components/CoresStatusPanel';

interface CoreSummary { connected: boolean; hasConfig: boolean }

export default function CoresPage() {
  const [stats, setStats] = useState<{ total: number; connected: number; configured: number }>({
    total: 0, connected: 0, configured: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/cores', { cache: 'no-store' });
        const data = await r.json();
        const cores: CoreSummary[] = Array.isArray(data?.cores) ? data.cores : [];
        setStats({
          total:      cores.length,
          connected:  cores.filter(c => c.connected).length,
          configured: cores.filter(c => c.hasConfig).length,
        });
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Network</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              5G core<br />management.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Configure and monitor 5G core network instances. Switch the active core, edit simulation parameters, and restart pods from one screen.
            </p>
            {/* decorative hex grid */}
            <svg className="absolute -right-10 -bottom-10 opacity-10" width="200" height="200" viewBox="0 0 200 200" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1.2" fill="none">
                <polygon points="100,20 160,55 160,125 100,160 40,125 40,55" />
                <polygon points="100,50 140,72 140,118 100,140 60,118 60,72" />
                <polygon points="100,80 120,92 120,108 100,120 80,108 80,92" />
              </g>
            </svg>
          </div>

          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>Cores</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                {stats.total}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                discovered
              </p>
            </div>
          </div>

          <div className="card-mint rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4">Connected</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--moss)' }}>
                {stats.connected}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                of {stats.total} healthy
              </p>
            </div>
          </div>
        </div>

        {/* Core panels (internals use legacy classes mapped via compat layer) */}
        <CoresStatusPanel />

        {/* Configuration guide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-cream rounded-lg p-7">
            <p className="eyebrow mb-3">Editing</p>
            <h3 className="font-display text-[20px] tracking-[-0.02em] mb-3 text-ink" style={{ fontWeight: 800 }}>
              Adjust simulation parameters.
            </h3>
            <ul className="space-y-2 text-[13px] text-ink-2">
              <li className="flex gap-2"><span className="text-ink-3">→</span> Click <span className="font-mono text-ink">Edit Config</span> on any core</li>
              <li className="flex gap-2"><span className="text-ink-3">→</span> Tune UEs, gNBs, arrival rate, network IDs</li>
              <li className="flex gap-2"><span className="text-ink-3">→</span> Changes persist to disk immediately</li>
            </ul>
          </div>

          <div className="card-pale rounded-lg p-7">
            <p className="eyebrow mb-3">Applying</p>
            <h3 className="font-display text-[20px] tracking-[-0.02em] mb-3 text-ink" style={{ fontWeight: 800 }}>
              Restart to take effect.
            </h3>
            <ul className="space-y-2 text-[13px] text-ink-2">
              <li className="flex gap-2"><span className="text-ink-3">→</span> Restart the <span className="font-mono text-ink">core-simulator</span> container</li>
              <li className="flex gap-2"><span className="text-ink-3">→</span> Start a new simulation to see updated metrics</li>
              <li className="flex gap-2"><span className="text-ink-3">→</span> Watch Grafana for real-time data</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
