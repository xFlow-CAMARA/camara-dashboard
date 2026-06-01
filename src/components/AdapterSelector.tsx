'use client';

import { useState, useEffect } from 'react';

interface AdapterSelectorProps {
  onAdapterChange?: (adapter: string) => void;
}

export default function AdapterSelector({ onAdapterChange }: AdapterSelectorProps) {
  const [selectedAdapter, setSelectedAdapter] = useState<string>('coresim');
  const [availableAdapters] = useState<string[]>(['coresim', 'free5gc']);

  useEffect(() => {
    // Load saved adapter preference
    const saved = localStorage.getItem('selectedAdapter');
    if (saved && availableAdapters.includes(saved)) {
      setSelectedAdapter(saved);
      onAdapterChange?.(saved);
    } else {
      onAdapterChange?.('coresim');
    }
  }, []);

  const handleChange = (adapter: string) => {
    setSelectedAdapter(adapter);
    localStorage.setItem('selectedAdapter', adapter);
    onAdapterChange?.(adapter);
    // Reload page to apply new adapter
    window.location.reload();
  };

  const getAdapterDisplayName = (adapter: string) => {
    switch (adapter) {
      case 'coresim':
        return 'CoreSim';
      case 'free5gc':
        return 'free5GC';
      default:
        return adapter;
    }
  };

  const getAdapterDescription = (adapter: string) => {
    switch (adapter) {
      case 'coresim':
        return 'CoreSim 5G Core Simulator — full CAMARA API support';
      case 'free5gc':
        return 'free5GC 5G Core — Traffic Influence via free5GC built-in NEF';
      default:
        return '';
    }
  };

  const getAdapterBadges = (adapter: string): { label: string; variant: 'green' | 'yellow' | 'red' }[] => {
    switch (adapter) {
      case 'coresim':
        return [
          { label: 'QoD', variant: 'green' },
          { label: 'Location', variant: 'green' },
          { label: 'Traffic Influence', variant: 'green' },
          { label: 'Number Verification', variant: 'green' },
          { label: 'SIM Swap', variant: 'green' },
          { label: 'Device Status', variant: 'green' },
        ];
      case 'free5gc':
        return [
          { label: 'QoD', variant: 'red' },
          { label: 'Location', variant: 'red' },
          { label: 'Traffic Influence', variant: 'green' },
          { label: 'Number Verification', variant: 'red' },
          { label: 'SIM Swap', variant: 'red' },
          { label: 'Device Status', variant: 'red' },
        ];
      default:
        return [];
    }
  };

  const badgeClass = (variant: 'green' | 'yellow' | 'red') => {
    switch (variant) {
      case 'green':  return 'bg-green-100 text-green-700';
      case 'yellow': return 'bg-yellow-100 text-yellow-700';
      case 'red':    return 'bg-red-100 text-red-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">5G Core Backend</h2>

      <div className="space-y-3">
        {availableAdapters.map((adapter) => (
          <label
            key={adapter}
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedAdapter === adapter
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="adapter"
              value={adapter}
              checked={selectedAdapter === adapter}
              onChange={(e) => handleChange(e.target.value)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {getAdapterDisplayName(adapter)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {getAdapterDescription(adapter)}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {getAdapterBadges(adapter).map((b) => (
                  <span
                    key={b.label}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(b.variant)}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>Current:</strong> {getAdapterDisplayName(selectedAdapter)}
        </p>
        <p className="text-xs text-gray-700 mt-1">
          Changes will take effect on page reload
        </p>
      </div>
    </div>
  );
}
