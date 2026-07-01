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
    <div className="space-y-4">
      <section className="card-lg overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-hairline">
          <div>
            <p className="eyebrow">Observability</p>
            <h2 className="font-display text-[26px] tracking-[-0.025em] mt-1" style={{ fontWeight: 800 }}>
              5G Core Simulator.
            </h2>
            <p className="text-[13px] text-ink-3 mt-1">Real-time core network metrics, streamed via Grafana</p>
          </div>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill-ghost"
          >
            Open Grafana →
          </a>
        </div>

        <div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-card-soft border-b border-hairline">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Live preview</span>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
            >
              Open in new tab ↗
            </a>
          </div>
          <div className="relative" style={{ height: '600px', background: 'var(--card-soft)' }}>
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

      <div
        className="card-lg px-4 py-3 flex items-start gap-3"
      >
        <span className="block w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--amber)' }} />
        <p className="text-[12px] text-ink-2">
          Default Grafana credentials are <span className="font-mono text-ink">admin / admin</span>.
          You may need to log in on first access.
        </p>
      </div>
    </div>
  );
}
