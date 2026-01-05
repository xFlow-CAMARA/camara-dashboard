import React from 'react';
import { RefreshCw } from 'lucide-react';

interface CapifHeaderProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export default function CapifHeader({ onRefresh, refreshing }: CapifHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-600">Service Registry</h1>
        <p className="text-gray-600 mt-2">
          Registered API services and endpoints
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}
