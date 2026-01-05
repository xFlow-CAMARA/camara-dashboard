'use client';

import React, { useState, useEffect } from 'react';
import { Server, Check, Loader2, AlertCircle } from 'lucide-react';

interface CoreInfo {
  activeCore: string;
  availableCores: string[];
}

export default function CoreSelector() {
  const [coreInfo, setCoreInfo] = useState<CoreInfo | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveCore();
  }, []);

  const fetchActiveCore = async () => {
    try {
      const response = await fetch('/api/cores/active');
      if (response.ok) {
        const data = await response.json();
        setCoreInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch active core:', err);
    }
  };

  const switchCore = async (coreName: string) => {
    if (coreName === coreInfo?.activeCore) return;

    setSwitching(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/cores/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreName })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Switched to ${coreName}. Restart NEF services to apply changes.`);
        await fetchActiveCore();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to switch core');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  const getCoreDisplayName = (core: string) => {
    const names: Record<string, string> = {
      'coresim': 'CoreSim'
    };
    return names[core] || core;
  };

  if (!coreInfo) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Active 5G Core Network</h3>
        </div>
        {switching && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-green-800">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {coreInfo.availableCores.map((core) => {
          const isActive = core === coreInfo.activeCore;
          return (
            <button
              key={core}
              onClick={() => switchCore(core)}
              disabled={switching || isActive}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${isActive 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                }
                ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isActive && (
                <div className="absolute top-2 right-2">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="text-center">
                <div className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                  {getCoreDisplayName(core)}
                </div>
                {isActive && (
                  <div className="text-xs text-blue-600 mt-1">Active</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Note:</strong> After switching cores, restart NEF services:
        </p>
        <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
          docker compose restart as-session-with-qos traffic-influence
        </code>
      </div>
    </div>
  );
}
