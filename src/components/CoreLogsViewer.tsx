'use client';

import { useEffect, useState } from 'react';

interface CoreNetworkLog {
  timestamp: string;
  service: string;
  message: string;
  level?: string;
}

interface CoreLogsViewerProps {
  apiName: string;
}

const API_SERVICE_MAP: { [key: string]: string[] } = {
  'QoD': ['3gpp-as-session-with-qos', 'core-network-service', 'tf-sdk-api'],
  'Device Location': ['3gpp-monitoring-event', 'core-network-service', 'tf-sdk-api'],
  'Traffic Influence': ['3gpp-traffic-influence', 'core-network-service', 'tf-sdk-api'],
  'Number Verification': ['ue-identity-service', 'core-network-service', 'tf-sdk-api'],
  'Device Status': ['core-network-service', 'tf-sdk-api'],
  'SIM Swap': ['ue-profile-service', 'core-network-service', 'tf-sdk-api'],
};

const API_FILTER_MAP: { [key: string]: string } = {
  'QoD': 'qod',
  'Device Location': 'location',
  'Traffic Influence': 'traffic-influence',
  'Number Verification': 'number-verification',
  'Device Status': 'device-status',
  'SIM Swap': 'sim-swap',
};


export default function CoreLogsViewer({ apiName }: CoreLogsViewerProps) {
  const [logs, setLogs] = useState<CoreNetworkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const services = API_SERVICE_MAP[apiName] || [];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const apiFilter = API_FILTER_MAP[apiName] || '';
      const response = await fetch(
        `/api/core-logs?services=${encodeURIComponent(services.join(','))}&lines=50&api=${encodeURIComponent(apiFilter)}`
      );
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch core logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchLogs();
      if (autoRefresh) {
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [expanded, autoRefresh]);

  const getLogLevelColor = (level?: string) => {
    if (!level) return 'text-gray-200';
    const l = level.toLowerCase();
    if (l.includes('error') || l.includes('fatal')) return 'text-red-400 font-bold';
    if (l.includes('warn')) return 'text-yellow-400 font-semibold';
    if (l.includes('info')) return 'text-cyan-400';
    if (l.includes('debug')) return 'text-gray-400';
    return 'text-gray-200';
  };

  const getServiceColor = (service: string) => {
    const colors: { [key: string]: string } = {
      '3gpp-as-session-with-qos': 'bg-blue-600 text-white',
      '3gpp-monitoring-event': 'bg-green-600 text-white',
      '3gpp-traffic-influence': 'bg-purple-600 text-white',
      'ue-identity-service': 'bg-orange-600 text-white',
      'core-network-service': 'bg-indigo-600 text-white',
      'tf-sdk-api': 'bg-pink-600 text-white',
    };
    return colors[service] || 'bg-gray-600 text-white';
  };

  return (
    <div className="mb-6 border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
          <span className="font-semibold text-gray-700">Core Network Logs</span>
          <span className="text-xs text-gray-500">(Filtered for {apiName} API)</span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2} 
          stroke="currentColor" 
          className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span>Showing logs for: <strong>{services.join(', ')}</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Auto-refresh (3s)</span>
                </label>
                
                <button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[600px] overflow-y-auto bg-gray-950 text-gray-100 font-mono text-sm leading-relaxed border-t-2 border-gray-700">
            {loading && logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-base">Loading core network logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-3 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <p className="text-gray-500 text-base">No logs available</p>
                <p className="text-gray-600 text-sm mt-2">Try making an API request to generate logs</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="hover:bg-gray-900 p-3 rounded-lg transition-all duration-150 border border-gray-800 hover:border-gray-700">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 shrink-0 font-semibold text-sm">{log.timestamp}</span>
                      <span className={`px-3 py-1 rounded-md text-xs font-bold shrink-0 shadow-sm ${getServiceColor(log.service)}`}>
                        {log.service}
                      </span>
                      <span className={`${getLogLevelColor(log.level)} break-all leading-relaxed`}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
