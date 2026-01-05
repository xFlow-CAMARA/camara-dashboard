'use client';

import { useEffect, useState } from 'react';

interface Provisioning {
  id: string;
  type: 'qod' | 'location' | 'traffic-influence';
  status: 'active' | 'expired' | 'completed';
  createdAt: string;
  details: string;
}

export default function ProvisioningStatus() {
  const [provisionings, setProvisionings] = useState<Provisioning[]>([]);

  // In a real app, this would fetch from an API or use WebSocket
  // For now, we'll use localStorage to track provisioning

  useEffect(() => {
    const stored = localStorage.getItem('provisionings');
    if (stored) {
      setProvisionings(JSON.parse(stored));
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'qod':
        return '⚡';
      case 'location':
        return '📍';
      case 'traffic-influence':
        return '🔀';
      default:
        return '📋';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'qod':
        return 'Quality on Demand';
      case 'location':
        return 'Location';
      case 'traffic-influence':
        return 'Traffic Influence';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Active Provisioning</h2>

      {provisionings.length === 0 ? (
        <div className="text-center py-8 text-gray-700">
          <p className="text-lg mb-2">No active provisioning</p>
          <p className="text-sm">Create a QoD session, query location, or set up traffic influence to see provisioning status here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {provisionings.map((prov) => (
            <div
              key={prov.id}
              className={`border rounded-lg p-4 ${getStatusColor(prov.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getTypeIcon(prov.type)}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{getTypeLabel(prov.type)}</h3>
                    <p className="text-xs mt-1 opacity-80">{prov.details}</p>
                    <p className="text-xs mt-1 font-mono">
                      {new Date(prov.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase px-2 py-1 rounded">
                  {prov.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
