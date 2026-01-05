'use client';

import { useEffect, useState } from 'react';
import { ProvisioningStatus } from '@/lib/types/camara';

export default function ProvisioningTable() {
  const [provisions, setProvisions] = useState<ProvisioningStatus[]>([]);

  // Load provisions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('camaraProvisions');
    if (stored) {
      try {
        setProvisions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse provisions:', e);
      }
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'qod':
        return 'QoD';
      case 'location':
        return 'Location';
      case 'traffic-influence':
        return 'Traffic Influence';
      default:
        return type;
    }
  };

  const handleDelete = (id: string) => {
    const updated = provisions.filter((p) => p.id !== id);
    setProvisions(updated);
    localStorage.setItem('camaraProvisions', JSON.stringify(updated));
  };

  if (provisions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Active Provisions</h2>
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No active provisions</p>
          <p className="text-sm mt-2">Create a QoD, Location, or Traffic Influence subscription to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Active Provisions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {provisions.map((provision) => (
              <tr key={provision.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {getTypeLabel(provision.type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 font-mono">{provision.id.slice(0, 16)}...</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(provision.status)}`}>
                    {provision.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {new Date(provision.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {provision.expiresAt ? new Date(provision.expiresAt).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(provision.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
