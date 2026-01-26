'use client';

import { useMemo, useState, useEffect } from 'react';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';
import { TrafficInfluenceResponse } from '@/lib/types/camara';
import { apiClient } from '@/lib/api-client';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { Trash2, RefreshCw, Search, Database } from 'lucide-react';

export default function TrafficInfluencePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrafficInfluenceResponse | null>(null);
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
  const [searchId, setSearchId] = useState('');
  const [filterId, setFilterId] = useState('');
  const [viewingInfluence, setViewingInfluence] = useState<any>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'flow' | 'logs'>('overview');

  function getHistoryAppId(influence: any): string {
    const tryParse = (value: any) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const readAppId = (value: any): string => {
      const obj = tryParse(value);
      if (!obj || typeof obj !== 'object') return '';
      return (
        obj.appId ||
        obj.appID ||
        obj?.data?.appId ||
        obj?.body?.appId ||
        obj?.payload?.appId ||
        ''
      );
    };

    return readAppId(influence?.response) || readAppId(influence?.request) || '';
  }

  const filteredHistoryData = useMemo(() => {
    const searchFilter = searchId.trim().toLowerCase();
    if (!searchFilter) return historyData;

    return historyData.filter((influence: any) => {
      const tiId = String(influence?.trafficInfluenceId ?? '').toLowerCase();
      const subscriptionId = String(influence?.subscriptionId ?? '').toLowerCase();
      const appId = String(getHistoryAppId(influence)).toLowerCase();
      
      return tiId.includes(searchFilter) || 
             subscriptionId.includes(searchFilter) || 
             appId.includes(searchFilter);
    });
  }, [historyData, searchId]);

  const [formData, setFormData] = useState({
    networkAccessIdentifier: '',
    deviceIp: '',
    appServerIp: '10.0.0.1',
    protocol: 'TCP',
    srcPort: '',
    dstPort: '80',
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
          if (isInitialLoad && !formData.networkAccessIdentifier) {
            setFormData(prev => ({
              ...prev,
              networkAccessIdentifier: formattedUes[0].supi,
              deviceIp: formattedUes[0].ipAddress,
            }));
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
        networkAccessIdentifier: formData.networkAccessIdentifier,
        ipv4Address: {
          publicAddress: formData.deviceIp,
        },
      },
      applicationServer: {
        ipv4Address: formData.appServerIp,
      },
      trafficFilters: [
        {
          protocol: formData.protocol,
          srcPort: formData.srcPort ? parseInt(formData.srcPort) : undefined,
          dstPort: formData.dstPort ? parseInt(formData.dstPort) : undefined,
        },
      ],
    };
    setRequestData(reqPayload);

    try {
      const data = await apiClient.createTrafficInfluence(reqPayload);
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
      let url = `/api/traffic-influence`;
      let options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      if (method === 'GET' && result?.subscriptionId) {
        url = `/api/traffic-influence?subscriptionId=${result.subscriptionId}`;
        options.method = 'GET';
      } else if (method === 'DELETE' && result?.subscriptionId) {
        url = `/api/traffic-influence?subscriptionId=${result.subscriptionId}`;
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
        endpoint: '/api/traffic-influence',
        status: 0,
        error: err.message,
        success: false,
      });
    } finally {
      setTestLoading(false);
    }
  };

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', skip: '0' });
      if (filterId) {
        params.append('trafficInfluenceId', filterId);
      }
      const response = await fetch(`/api/history/traffic-influence?${params}`);
      const data = await response.json();
      setHistoryData(data.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleHistorySearch() {
    setFilterId(searchId);
    fetchHistory();
  }

  function clearHistoryFilter() {
    setSearchId('');
    setFilterId('');
    fetchHistory();
  }

  async function deleteHistoryItem(trafficInfluenceId: string) {
    if (!confirm(`Delete traffic influence ${trafficInfluenceId}?`)) return;
    try {
      const response = await fetch(`/api/history/traffic-influence/${trafficInfluenceId}`, {
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
        {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Traffic Influence</h2> */}

        {/* API Metrics */}
        <ApiMetrics apiName="Traffic Influence" />

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
              Traffic Influence History
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
            Network Access Identifier (IMSI/SUPI)
          </label>
          {ueList.length > 0 ? (
            <select
              value={formData.networkAccessIdentifier}
              onChange={(e) => {
                const selectedUe = ueList.find(ue => ue.supi === e.target.value);
                setFormData({
                  ...formData,
                  networkAccessIdentifier: e.target.value,
                  deviceIp: selectedUe?.ipAddress || '',
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            >
              {ueList.map((ue) => (
                <option key={ue.supi} value={ue.supi}>
                  {ue.supi} ({ue.ipAddress})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.networkAccessIdentifier}
              onChange={(e) =>
                setFormData({ ...formData, networkAccessIdentifier: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="001010000000001"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device IP Address
          </label>
          <input
            type="text"
            value={formData.deviceIp}
            onChange={(e) => setFormData({ ...formData, deviceIp: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="Auto-filled from selected UE"
            required
          />
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
            <select
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Port (Optional)
            </label>
            <input
              type="number"
              value={formData.srcPort}
              onChange={(e) => setFormData({ ...formData, srcPort: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="Any"
              min="1"
              max="65535"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Port
            </label>
            <input
              type="number"
              value={formData.dstPort}
              onChange={(e) => setFormData({ ...formData, dstPort: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="80"
              min="1"
              max="65535"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Subscription...' : 'Create Traffic Influence'}
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
            <h3 className="text-lg font-semibold text-green-800">
              ✓ Traffic Influence Created
            </h3>
            <button
              onClick={() => setShowJson(!showJson)}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              {showJson ? 'Hide JSON' : 'Show JSON'}
            </button>
          </div>
          
          {showJson ? (
            <pre className="bg-gray-900 text-green-300 p-4 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Subscription ID:</span>
                <span className="text-gray-900 font-mono text-xs">{result.subscriptionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">State:</span>
                <span className="text-green-600 font-semibold">{result.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">App Server:</span>
                <span className="text-gray-900">{result.applicationServer.ipv4Address}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Created At:</span>
                <span className="text-gray-900">{new Date(result.createdAt).toLocaleString()}</span>
              </div>
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
            onClick={() => testEndpoint('GET', '/subscriptions/{subscriptionId}')}
            disabled={testLoading || !result?.subscriptionId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            GET Subscription by ID
          </button>
          <button
            onClick={() => testEndpoint('DELETE', '/subscriptions/{subscriptionId}')}
            disabled={testLoading || !result?.subscriptionId}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            DELETE Subscription
          </button>
        </div>

        {!result?.subscriptionId && (
          <p className="text-sm text-gray-500 italic">
            Create a traffic influence subscription first to test GET and DELETE endpoints
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
              <h3 className="text-xl font-semibold text-gray-800">Traffic Influence History</h3>
            </div>
            <button
              onClick={fetchHistory}
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
                placeholder="Search by TI ID or App ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchId && (
                <button
                  onClick={() => setSearchId('')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
              <button
                onClick={fetchHistory}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* History Table */}
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-900">Loading history...</p>
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-900">No traffic influences found in history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TI ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Consumer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">App ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.map((influence: any) => (
                      <tr key={influence._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {influence.trafficInfluenceId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            influence.operation === 'CREATE' ? 'bg-green-100 text-green-800' :
                            influence.operation === 'DELETE' ? 'bg-red-100 text-red-800' :
                            influence.operation === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {influence.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{influence.response?.apiConsumerId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{getHistoryAppId(influence) || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(influence.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            influence.statusCode >= 200 && influence.statusCode < 300
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {influence.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setViewingInfluence(influence)}
                              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-300 hover:border-blue-500 text-xs font-medium transition-colors"
                              title="View Request/Response"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(influence.trafficInfluenceId)}
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

          {/* View Traffic Influence Modal */}
          {viewingInfluence && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingInfluence(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Traffic Influence Details</h3>
                  <button
                    onClick={() => setViewingInfluence(null)}
                    className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Subscription Info</h4>
                      <div className="bg-gray-50 rounded p-3 space-y-1 text-sm text-gray-900">
                        <div><span className="font-medium text-gray-900">Traffic Influence ID:</span> <span className="font-mono text-xs text-gray-900">{viewingInfluence.trafficInfluenceId}</span></div>
                        <div><span className="font-medium text-gray-900">Operation:</span> <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{viewingInfluence.operation}</span></div>
                        <div><span className="font-medium text-gray-900">Status:</span> <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{viewingInfluence.statusCode}</span></div>
                        <div><span className="font-medium text-gray-900">Timestamp:</span> <span className="text-gray-900">{new Date(viewingInfluence.createdAt).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Request</h4>
                      <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                        <pre className="text-xs text-green-300 font-mono">{JSON.stringify(viewingInfluence.request, null, 2)}</pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Response</h4>
                      <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                        <pre className="text-xs text-green-300 font-mono">{JSON.stringify(viewingInfluence.response, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end p-4 border-t border-gray-200">
                  <button
                    onClick={() => setViewingInfluence(null)}
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
              apiType="traffic" 
              requestData={requestData}
              responseData={result}
              onComplete={() => {}}
            />
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg mb-2">No flow sequence available</p>
              <p className="text-gray-500 text-sm">Create a Traffic Influence subscription first to view the network flow visualization</p>
            </div>
          )}
        </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
        <div className="space-y-6">
          <LogsViewer apiName="Traffic Influence" />
          <CoreLogsViewer apiName="Traffic Influence" />
        </div>
        )}
      </div>
    </div>
  );
}
