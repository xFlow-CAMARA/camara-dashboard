'use client';

import { useMemo, useState, useEffect } from 'react';
import { QodSessionResponse } from '@/lib/types/camara';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { apiClient } from '@/lib/api-client';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';
import { Trash2, RefreshCw, Search, Database } from 'lucide-react';

export default function QodPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QodSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ueList, setUeList] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  
  // History state
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchSessionId, setSearchSessionId] = useState('');
  const [filterSessionId, setFilterSessionId] = useState('');
  const [viewingSession, setViewingSession] = useState<any>(null);

  // History filters (client-side)
  const [historyQosProfileFilter, setHistoryQosProfileFilter] = useState('');
  const [historyDeviceIpFilter, setHistoryDeviceIpFilter] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'flow' | 'logs'>('overview');

  const filteredHistoryData = useMemo(() => {
    const normalizeQos = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const qosFilter = normalizeQos(historyQosProfileFilter);
    const deviceIpFilter = historyDeviceIpFilter.trim().toLowerCase();

    return historyData.filter((session: any) => {
      if (qosFilter) {
        const sessionQosCandidates = [
          session?.qosProfile,
          session?.response?.qosProfile,
          session?.request?.qosProfile,
        ];
        const matchesQos = sessionQosCandidates.some((candidate: unknown) => normalizeQos(candidate) === qosFilter);
        if (!matchesQos) return false;
      }

      if (deviceIpFilter) {
        const deviceIp = String(
          session?.device?.ipv4Address?.publicAddress ??
            session?.request?.device?.ipv4Address?.publicAddress ??
            session?.response?.device?.ipv4Address?.publicAddress ??
            ''
        ).toLowerCase();
        if (!deviceIp.includes(deviceIpFilter)) return false;
      }

      return true;
    });
  }, [historyData, historyQosProfileFilter, historyDeviceIpFilter]);

  const availableHistoryQosProfiles = useMemo(() => {
    const normalizeQos = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const values = new Set<string>();
    // Always show known QoD profiles even if they aren't present
    // in the currently loaded page of results.
    ['qos-e', 'qos2', 'qos3'].forEach((q) => values.add(q));
    for (const session of historyData) {
      const candidates = [
        session?.qosProfile,
        session?.request?.qosProfile,
        session?.response?.qosProfile,
      ];
      for (const candidate of candidates) {
        const norm = normalizeQos(candidate);
        if (norm) values.add(norm);
      }
    }

    const preferredOrder = ['qos-e', 'qos2', 'qos3'];
    return Array.from(values).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      return a.localeCompare(b);
    });
  }, [historyData]);

  const [formData, setFormData] = useState({
    deviceIp: '',
    appServerIp: '10.0.0.1',
    qosProfile: 'qos-e',
    duration: 3600,
  });

  // Fetch UEs from CoreSim on mount
  useEffect(() => {
    let isInitialLoad = true;
    
    const fetchUes = async () => {
      try {
        const data = await apiClient.getCores();
        const coresim = data.cores?.find((c: any) => c.name === 'coresim');
        if (coresim?.ues && coresim.ues.length > 0) {
          // Convert format from {imsi, ip} to {supi, ipAddress}
          const formattedUes = coresim.ues.map((ue: any) => ({
            supi: ue.imsi,
            ipAddress: ue.ip,
          }));
          setUeList(formattedUes);
          // Set first UE as default only on initial load
          if (isInitialLoad && !formData.deviceIp) {
            setFormData(prev => ({ ...prev, deviceIp: formattedUes[0].ipAddress }));
            isInitialLoad = false;
          }
        }
      } catch (error) {
        console.error('Failed to fetch UEs:', error);
      }
    };
    fetchUes();
    // Refresh every 10 seconds
    const interval = setInterval(fetchUes, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowVisualization(true);

    const reqPayload = {
      device: {
        ipv4Address: {
          publicAddress: formData.deviceIp,
        },
      },
      applicationServer: {
        ipv4Address: formData.appServerIp,
      },
      qosProfile: formData.qosProfile,
      duration: formData.duration,
    };
    setRequestData(reqPayload);

    try {
      const data = await apiClient.createQodSession(reqPayload);

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (method: string, endpoint: string) => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      let url = `/api/qod`;
      let options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      if (method === 'GET' && result?.sessionId) {
        url = `/api/qod?sessionId=${result.sessionId}`;
        options.method = 'GET';
      } else if (method === 'DELETE' && result?.sessionId) {
        url = `/api/qod?sessionId=${result.sessionId}`;
        options.method = 'DELETE';
      }

      const response = await fetch(url, options);
      
      // Handle 204 No Content (DELETE returns no body)
      let data = null;
      if (response.status !== 204) {
        data = await response.json();
      }

      setTestResult({
        method: method,
        endpoint: url,
        status: response.status,
        data: data,
        success: response.ok,
      });
    } catch (err: any) {
      setTestResult({
        method,
        endpoint: '/api/qod',
        status: 0,
        error: err.message,
        success: false,
      });
    } finally {
      setTestLoading(false);
    }
  };

  async function fetchHistory(sessionIdOverride?: string) {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', skip: '0' });
      const effectiveSessionId = (sessionIdOverride ?? filterSessionId).trim();
      if (effectiveSessionId) {
        params.append('sessionId', effectiveSessionId);
      }
      const response = await fetch(`/api/history/qod?${params}`);
      const data = await response.json();
      setHistoryData(data.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleHistorySearch() {
    const nextFilter = searchSessionId.trim();
    setFilterSessionId(nextFilter);
    fetchHistory(nextFilter);
  }

  function clearHistoryFilter() {
    setSearchSessionId('');
    setFilterSessionId('');
    fetchHistory('');
  }

  async function deleteHistoryItem(sessionId: string) {
    if (!confirm(`Delete session ${sessionId}?`)) return;
    try {
      const response = await fetch(`/api/history/qod/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.status === 204) {
        fetchHistory();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Quality on Demand (QoD)</h2> */}

        {/* API Metrics */}
        <ApiMetrics apiName="QoD" />

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                if (!showHistory) {
                  setShowHistory(true);
                  fetchHistory();
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Session History
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'flow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flow Sequence
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <>
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device IP Address
          </label>
          {ueList.length > 0 ? (
            <select
              value={formData.deviceIp}
              onChange={(e) => setFormData({ ...formData, deviceIp: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            >
              {ueList.map((ue) => (
                <option key={ue.supi} value={ue.ipAddress}>
                  {ue.ipAddress} ({ue.supi})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.deviceIp}
              onChange={(e) => setFormData({ ...formData, deviceIp: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="12.1.0.1"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application Server IP
          </label>
          <input
            type="text"
            value={formData.appServerIp}
            onChange={(e) => setFormData({ ...formData, appServerIp: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="10.0.0.1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QoS Profile
          </label>
          <select
            value={formData.qosProfile}
            onChange={(e) => setFormData({ ...formData, qosProfile: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="qos-e">qos-e (Guaranteed 120Kbps)</option>
            <option value="qos2">qos2 (Guaranteed 240Kbps)</option>
            <option value="qos3">qos3 (Guaranteed 480Kbps)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            min="60"
            max="86400"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Session...' : 'Create QoD Session'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          <div className="flex items-start">
            <strong className="font-bold mr-2">Error: </strong>
            <div>
              <span>{error}</span>
              {(error as any).code && (
                <span className="ml-2 text-xs bg-red-200 px-2 py-0.5 rounded">
                  {(error as any).code}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-green-800">✓ QoD Session Created</h3>
            <button
              onClick={() => setShowJson(!showJson)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              {showJson ? 'Hide JSON' : 'Show JSON'}
            </button>
          </div>

          {showJson ? (
            <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
              <pre className="text-sm text-green-300 font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Session ID:</span>
                <span className="text-gray-900 font-mono">{result.sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">QoS Profile:</span>
                <span className="text-gray-900">{result.qosProfile}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Status:</span>
                <span className="text-green-600 font-semibold">{result.qosStatus}</span>
              </div>
              {result.startedAt && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Started At:</span>
                  <span className="text-gray-900">{new Date(result.startedAt).toLocaleString()}</span>
                </div>
              )}
              {result.expiresAt && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800">Expires At:</span>
                  <span className="text-gray-900">{new Date(result.expiresAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        </>
        )}

        {/* API Testing Section */}
        {/* <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Test API Endpoints</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => testEndpoint('GET', '/sessions/{sessionId}')}
            disabled={testLoading || !result?.sessionId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            GET Session by ID
          </button>
          <button
            onClick={() => testEndpoint('DELETE', '/sessions/{sessionId}')}
            disabled={testLoading || !result?.sessionId}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            DELETE Session
          </button>
        </div>

        {!result?.sessionId && (
          <p className="text-sm text-gray-500 italic">
            Create a QoD session first to test GET by ID and DELETE endpoints
          </p>
        )}

        {testResult && (
          <div className={`mt-4 p-4 rounded-md border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">
                {testResult.success ? '✓' : '✗'} {testResult.method}
              </h4>
              <span className={`text-sm px-2 py-1 rounded ${
                testResult.success 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {testResult.status}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2 font-mono">
              {testResult.endpoint}
            </div>
            <div className="bg-gray-900 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">
              <pre className="text-xs text-green-300 font-mono">
                {JSON.stringify(testResult.data || testResult.error, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div> */}

        {/* History Tab */}
        {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={24} className="text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">Session History</h3>
            </div>
            <button
              onClick={() => fetchHistory()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Session ID"
                value={searchSessionId}
                onChange={(e) => setSearchSessionId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHistorySearch()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleHistorySearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Search size={18} />
                Search
              </button>
              {filterSessionId && (
                <button
                  onClick={clearHistoryFilter}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => fetchHistory()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={historyQosProfileFilter}
                onChange={(e) => setHistoryQosProfileFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All QoS</option>
                {availableHistoryQosProfiles.map((qos) => (
                  <option key={qos} value={qos}>
                    {qos}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Device IPv4"
                value={historyDeviceIpFilter}
                onChange={(e) => setHistoryDeviceIpFilter(e.target.value)}
                className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* History Table */}
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-900">Loading history...</p>
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-900">No sessions found in history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QoS Profile</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.map((session: any) => (
                      <tr key={session._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {session.sessionId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            session.operation === 'CREATE' ? 'bg-green-100 text-green-800' :
                            session.operation === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {session.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{session.qosProfile || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {session.device?.phoneNumber || session.device?.ipv4Address?.publicAddress || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(session.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            session.statusCode >= 200 && session.statusCode < 300
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {session.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingSession(session)}
                              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-300 hover:border-blue-500 text-xs font-medium transition-colors"
                              title="View Request/Response"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(session.sessionId)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* View Session Modal */}
          {viewingSession && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingSession(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Session Details</h3>
                  <button
                    onClick={() => setViewingSession(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Session Info</h4>
                      <div className="bg-gray-50 rounded p-3 space-y-1 text-sm text-gray-900">
                        <div><span className="font-medium text-gray-900">Session ID:</span> <span className="font-mono text-xs text-gray-900">{viewingSession.sessionId}</span></div>
                        <div><span className="font-medium text-gray-900">Operation:</span> <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{viewingSession.operation}</span></div>
                        <div><span className="font-medium text-gray-900">Status:</span> <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{viewingSession.statusCode}</span></div>
                        <div><span className="font-medium text-gray-900">Timestamp:</span> <span className="text-gray-900">{new Date(viewingSession.createdAt).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Request</h4>
                      <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                        <pre className="text-xs text-green-300 font-mono">{JSON.stringify(viewingSession.request, null, 2)}</pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Response</h4>
                      <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                        <pre className="text-xs text-green-300 font-mono">{JSON.stringify(viewingSession.response, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end p-4 border-t border-gray-200">
                  <button
                    onClick={() => setViewingSession(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Flow Sequence Tab */}
        {activeTab === 'flow' && (
        <div>
          {showVisualization && result ? (
            <EnhancedNetworkFlow 
              apiType="qod" 
              requestData={requestData}
              responseData={result}
              onComplete={() => {}}
            />
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg mb-2">No flow sequence available</p>
              <p className="text-gray-500 text-sm">Create a QoD session first to view the network flow visualization</p>
            </div>
          )}
        </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
        <div className="space-y-6">
          <LogsViewer apiName="QoD" />
          <CoreLogsViewer apiName="QoD" />
        </div>
        )}
      </div>
    </div>
  );
}
