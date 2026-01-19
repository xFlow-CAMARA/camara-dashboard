'use client';

import { useEffect, useState } from 'react';

interface ApiMetrics {
  total_requests: number;
  success_count: number;
  error_count: number;
  avg_latency_ms: number;
  error_rate: number;
}

interface ApiMetricsProps {
  apiName: string;
}

export default function ApiMetrics({ apiName }: ApiMetricsProps) {
  const [metrics, setMetrics] = useState<ApiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/metrics?api=${encodeURIComponent(apiName)}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Reset all metrics for ${apiName}? This will delete all log entries.`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`/api/metrics/reset?api=${encodeURIComponent(apiName)}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchMetrics(); // Refresh metrics
      } else {
        alert('Failed to reset metrics');
      }
    } catch (error) {
      console.error('Failed to reset metrics:', error);
      alert('Error resetting metrics');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [apiName]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const successRate = metrics.total_requests > 0 
    ? ((metrics.success_count / metrics.total_requests) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">API Metrics (Last 24 hours)</h3>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resetting ? 'Resetting...' : 'Reset Metrics'}
        </button>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm font-medium text-blue-700 mb-1">Total Requests</div>
        <div className="text-2xl font-bold text-blue-900">{metrics.total_requests.toLocaleString()}</div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="text-sm font-medium text-green-700 mb-1">Success Rate</div>
        <div className="text-2xl font-bold text-green-900">{successRate}%</div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm font-medium text-purple-700 mb-1">Avg Latency</div>
        <div className="text-2xl font-bold text-purple-900">
          {metrics.avg_latency_ms ? metrics.avg_latency_ms.toFixed(1) : '0.0'}ms
        </div>
      </div>

      <div className={`${metrics.error_count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
        <div className={`text-sm font-medium ${metrics.error_count > 0 ? 'text-red-700' : 'text-gray-700'} mb-1`}>
          Errors
        </div>
        <div className={`text-2xl font-bold ${metrics.error_count > 0 ? 'text-red-900' : 'text-gray-900'}`}>
          {metrics.error_count}
        </div>
      </div>
    </div>
    </div>
  );
}
