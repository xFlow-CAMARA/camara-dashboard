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
    // Fetch active core from backend
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
      
      // Fallback to localStorage
      const saved = localStorage.getItem('selectedCore');
      if (saved && adapters.includes(saved)) {
        setSelectedAdapter(saved);
      }
    };
    
    fetchActiveCore();
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await apiClient.getHealth(selectedAdapter);
        setHealth(data);
      } catch (error) {
        setHealth({ connected: false });
      } finally {
        setChecking(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [selectedAdapter]);

  const handleCoreChange = async (core: string) => {
    if (core === selectedAdapter) return;
    
    setChecking(true);
    try {
      // Call backend API to switch active core
      const response = await fetch('/api/cores/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreName: core })
      });
      
      if (response.ok) {
        setSelectedAdapter(core);
        localStorage.setItem('selectedCore', core);
        
        // Show success message
        const data = await response.json();
        alert(`✓ Switched to ${core}\n\n${data.message}\n\nRestarting NEF services...`);
        
        // Restart NEF services via API
        try {
          await fetch('/api/nef/restart', { method: 'POST' });
        } catch (err) {
          console.error('Failed to restart NEF services:', err);
        }
        
        // Reload to apply changes
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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CAMARA API Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Test and monitor CAMARA APIs with multiple 5G core backends</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">5G Core:</label>
            <select
              value={selectedAdapter}
              onChange={(e) => handleCoreChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              {adapters.map((adapter) => (
                <option key={adapter} value={adapter}>
                  {adapter.charAt(0).toUpperCase() + adapter.slice(1)}
                </option>
              ))}
            </select>
            
            {checking ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                Checking...
              </div>
            ) : health.connected ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Disconnected
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
