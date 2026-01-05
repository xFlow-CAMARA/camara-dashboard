'use client';

import { useState, useEffect } from 'react';

interface AdapterSelectorProps {
  onAdapterChange?: (adapter: string) => void;
}

export default function AdapterSelector({ onAdapterChange }: AdapterSelectorProps) {
  const [selectedAdapter, setSelectedAdapter] = useState<string>('tfsdk');
  const [availableAdapters] = useState<string[]>(['tfsdk', 'coresim']);

  useEffect(() => {
    // Load saved adapter preference
    const saved = localStorage.getItem('selectedAdapter');
    if (saved && availableAdapters.includes(saved)) {
      setSelectedAdapter(saved);
      onAdapterChange?.(saved);
    } else {
      onAdapterChange?.('tfsdk');
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
      case 'tfsdk':
        return 'TF-SDK';
      case 'coresim':
        return 'CoreSim Direct';
      default:
        return adapter;
    }
  };

  const getAdapterDescription = (adapter: string) => {
    switch (adapter) {
      case 'tfsdk':
        return 'CAMARA-compliant SDK with validation & error handling';
      case 'coresim':
        return 'Direct 3GPP NEF integration';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Backend Adapter</h2>
      
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
