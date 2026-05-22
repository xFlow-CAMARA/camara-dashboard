'use client';

import { useEffect, useState } from 'react';

const DASHBOARD_PATH = '/grafana/d/5g-core-sim/5g-core-simulator-dashboard';

export default function MonitoringPanel() {
  /* Grafana is proxied through the dashboard origin (Next.js rewrites
   * /grafana/* → grafana:3000/grafana/*) so the iframe works over the
   * single port the user reaches the dashboard at. No extra SSH tunnel. */
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const dashboardUrl = DASHBOARD_PATH;
  const embedUrl     = `${DASHBOARD_PATH}?orgId=1&refresh=5s&kiosk`;

  return (
    <div className="space-y-6">
      <section className="surface-lg overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-hairline">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Observability</p>
            <h2 className="font-display text-[22px] tracking-[-0.015em] mt-1">
              5G Core Simulator
            </h2>
            <p className="text-[13px] text-ink-3 mt-1">Real-time core network metrics, streamed via Grafana</p>
          </div>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Open Grafana →
          </a>
        </div>

        <div className="border-t border-hairline">
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-bg-sunken border-b border-hairline"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-3">
              Live preview
            </span>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.18em] text-sage-700 hover:text-sage-900"
            >
              Open in new tab ↗
            </a>
          </div>
          <div className="relative" style={{ height: '600px', background: 'var(--bg-sunken)' }}>
            {ready ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                frameBorder="0"
                title="5G Core Simulator Grafana Dashboard"
                allow="fullscreen"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-3">
                Loading…
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="surface px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Status</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--moss)' }} />
            <span className="text-[14px] text-ink">Online</span>
          </div>
        </div>
        <div className="surface px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-3">Metrics</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="block w-2 h-2 rounded-full" style={{ background: 'var(--sage-500)' }} />
            <span className="text-[14px] text-ink">Real-time</span>
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3 rounded-sm text-[12px] flex items-start gap-2"
        style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}
      >
        <span className="font-mono mt-px">!</span>
        <p>
          Default Grafana credentials are <span className="font-mono">admin / admin</span>.
          You may need to log in on first access.
        </p>
      </div>
    </div>
  );
}
