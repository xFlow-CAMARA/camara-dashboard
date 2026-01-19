'use client';

import { useState, useEffect } from 'react';
import { QodSessionResponse } from '@/lib/types/camara';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { apiClient } from '@/lib/api-client';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';

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

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Quality on Demand (QoD)</h2> */}

        {/* API Metrics */}
        <ApiMetrics apiName="QoD" />

        {/* Request Logs */}
        <LogsViewer apiName="QoD" />

        {/* Core Network Logs */}
        <CoreLogsViewer apiName="QoD" />

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
      </div>

      {/* API Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
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
      </div>

      {/* Network Flow Visualization */}
      {showVisualization && (
        <EnhancedNetworkFlow 
          apiType="qod" 
          requestData={requestData}
          responseData={result}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}
