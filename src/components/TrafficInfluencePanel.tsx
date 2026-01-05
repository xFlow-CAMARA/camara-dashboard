'use client';

import { useState, useEffect } from 'react';
import { TrafficInfluenceResponse } from '@/lib/types/camara';
import { apiClient } from '@/lib/api-client';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';

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
      } else if (method === 'GET_ALL') {
        url = `/api/traffic-influence`;
        options.method = 'GET';
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setTestResult({
        method: method === 'GET_ALL' ? 'GET /subscriptions' : method,
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

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Traffic Influence</h2>

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
                <span className="font-medium text-gray-700">Subscription ID:</span>
                <span className="text-gray-900 font-mono text-xs">{result.subscriptionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">State:</span>
                <span className="text-green-600 font-semibold">{result.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">App Server:</span>
                <span className="text-gray-900">{result.applicationServer.ipv4Address}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Created At:</span>
                <span className="text-gray-900">{new Date(result.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* API Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Test API Endpoints</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => testEndpoint('GET_ALL', '/subscriptions')}
            disabled={testLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            GET All Subscriptions
          </button>
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
            Create a traffic influence subscription first to test GET by ID and DELETE endpoints
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
      </div>

      {/* Network Flow Visualization */}
      {showVisualization && (
        <EnhancedNetworkFlow 
          apiType="traffic" 
          requestData={requestData}
          responseData={result}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}
