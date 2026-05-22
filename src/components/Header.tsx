'use client';

import { useEffect, useState } from 'react';
import { getAvailableAdapters } from '@/lib/adapters';
import { apiClient } from '@/lib/api-client';

interface HealthStatus {
  connected: boolean;
  services?: {
    coresim?: { available: boolean; status?: string };
    qod?: { available: boolean };
    location?: { available: boolean };
    trafficInfluence?: { available: boolean };
  };
}

export default function Header() {
  const adapters = getAvailableAdapters();
  const [selectedAdapter, setSelectedAdapter] = useState('coresim');
  const [health, setHealth] = useState<HealthStatus>({ connected: false });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchActiveCore = async () => {
      try {
        const response = await fetch('/api/cores/active');
        if (response.ok) {
          const data = await response.json();
          if (data.activeCore && adapters.includes(data.activeCore)) {
            setSelectedAdapter(data.activeCore);
            localStorage.setItem('selectedCore', data.activeCore);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch active core:', error);
      }
      const saved = localStorage.getItem('selectedCore');
      if (saved && adapters.includes(saved)) {
        setSelectedAdapter(saved);
      }
    };
    fetchActiveCore();
  }, [adapters]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await apiClient.getHealth(selectedAdapter);
        setHealth(data);
      } catch {
        setHealth({ connected: false });
      } finally {
        setChecking(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [selectedAdapter]);

  const handleCoreChange = async (core: string) => {
    if (core === selectedAdapter) return;
    setChecking(true);
    try {
      const response = await fetch('/api/cores/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreName: core }),
      });
      if (response.ok) {
        setSelectedAdapter(core);
        localStorage.setItem('selectedCore', core);
        const data = await response.json();
        alert(`✓ Switched to ${core}\n\n${data.message}\n\nRestarting NEF services...`);
        try { await fetch('/api/nef/restart', { method: 'POST' }); } catch {}
        window.location.reload();
      } else {
        const error = await response.json().catch(() => ({ detail: 'Connection failed' }));
        alert(`✗ Failed to switch core: ${error.detail || error.error || 'Unknown error'}\n\nMake sure TF-SDK API is running.`);
      }
    } catch (error) {
      console.error('Core switch error:', error);
      alert(`✗ Error switching core: ${(error as Error).message}\n\nTF-SDK API may be unavailable.`);
      setChecking(false);
    }
  };

  const dotColor = checking ? 'var(--ink-3)' : health.connected ? 'var(--moss)' : 'var(--rust)';
  const dotBg    = checking ? 'var(--bg-sunken)' : health.connected ? 'var(--moss-bg)' : 'var(--rust-bg)';
  const label    = checking ? 'Checking' : health.connected ? 'Connected' : 'Disconnected';

  return (
    <div className="flex items-center justify-between gap-6 min-w-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3">CAMARA · Operator</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <label className="text-[11px] uppercase tracking-[0.18em] text-ink-3">Core</label>
        <select
          value={selectedAdapter}
          onChange={(e) => handleCoreChange(e.target.value)}
          className="px-3 py-1.5 text-[12px] font-mono border rounded-sm focus:outline-none focus:ring-2"
          style={{
            background: 'var(--bg-elev)',
            borderColor: 'var(--hairline-2)',
            color: 'var(--ink)',
          }}
        >
          {adapters.map((adapter) => (
            <option key={adapter} value={adapter}>
              {adapter.charAt(0).toUpperCase() + adapter.slice(1)}
            </option>
          ))}
        </select>

        <span
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm text-[11px] uppercase tracking-[0.16em] font-mono"
          style={{ background: dotBg, color: dotColor }}
        >
          <span
            className={`block w-1.5 h-1.5 rounded-full ${checking || health.connected ? 'animate-pulse' : ''}`}
            style={{ background: dotColor }}
          />
          {label}
        </span>
      </div>
    </div>
  );
}
