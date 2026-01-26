'use client';

import { useState, useEffect, useRef } from 'react';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { apiClient } from '@/lib/api-client';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';

interface ReachabilityResult {
  // CAMARA compliant fields
  reachable?: boolean;
  connectivity?: string[];  // ['DATA'], ['SMS'], or ['DATA', 'SMS']
  lastStatusTime?: string;
  device?: any;
  // Legacy field for backwards compatibility
  reachabilityStatus?: string;
}

interface RoamingResult {
  roaming?: boolean;
  countryCode?: number;
  countryName?: string[];
}

export default function DeviceStatusPanel() {
  const [loading, setLoading] = useState(false);
  const [reachabilityResult, setReachabilityResult] = useState<ReachabilityResult | null>(null);
  const [roamingResult, setRoamingResult] = useState<RoamingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ueList, setUeList] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reachability' | 'roaming'>('reachability');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  
  // View tab state
  const [viewTab, setViewTab] = useState<'overview' | 'flow' | 'logs'>('overview');

  const [formData, setFormData] = useState({
    deviceIp: '',
    phoneNumber: '',
    networkAccessIdentifier: '',
  });

  // Track if we've already set the initial UE
  const hasSetInitialUe = useRef(false);

  // Fetch UEs from CoreSim on mount
  useEffect(() => {
    const fetchUes = async () => {
      try {
        const data = await apiClient.getCores();
        const coresim = data.cores?.find((c: any) => c.name === 'coresim');
        if (coresim?.ues && coresim.ues.length > 0) {
          const formattedUes = coresim.ues.map((ue: any) => {
            const imsi = ue.imsi || '';
            const msisdn = ue.msisdn || `+336${imsi.slice(-8)}`;
            return {
              supi: imsi,
              ipAddress: ue.ip,
              msisdn,
            };
          });
          setUeList(formattedUes);
          // Set first UE as default only once on initial load
          if (!hasSetInitialUe.current && !formData.deviceIp) {
            setFormData(prev => ({
              ...prev,
              deviceIp: formattedUes[0].ipAddress,
              phoneNumber: formattedUes[0].msisdn,
            }));
            hasSetInitialUe.current = true;
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

  // Handle UE selection
  const handleUeSelect = (ipAddress: string) => {
    const selectedUe = ueList.find(ue => ue.ipAddress === ipAddress);
    if (selectedUe) {
      setFormData(prev => ({
        ...prev,
        deviceIp: ipAddress,
        phoneNumber: selectedUe.msisdn,
      }));
    }
  };

  // Get Reachability Status
  const handleGetReachability = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setReachabilityResult(null);
    setRoamingResult(null);
    setShowVisualization(true);

    const reqPayload: any = {
      device: {
        ipv4Address: {
          publicAddress: formData.deviceIp,
        },
      },
    };

    if (formData.phoneNumber) {
      reqPayload.device.phoneNumber = formData.phoneNumber;
    }

    setRequestData(reqPayload);

    try {
      const data = await apiClient.getReachabilityStatus(reqPayload);
      setReachabilityResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get Roaming Status
  const handleGetRoaming = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setReachabilityResult(null);
    setRoamingResult(null);
    setShowVisualization(true);

    const reqPayload: any = {
      device: {
        ipv4Address: {
          publicAddress: formData.deviceIp,
        },
      },
    };

    if (formData.phoneNumber) {
      reqPayload.device.phoneNumber = formData.phoneNumber;
    }

    setRequestData(reqPayload);

    try {
      const data = await apiClient.getRoamingStatus(reqPayload);
      setRoamingResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test API endpoints
  const testEndpoint = async (method: string) => {
    setTestLoading(true);
    setTestResult(null);

    try {
      let data: any;
      let endpoint = '';

      const payload: any = {
        device: {
          ipv4Address: {
            publicAddress: formData.deviceIp,
          },
        },
      };

      if (formData.phoneNumber) {
        payload.device.phoneNumber = formData.phoneNumber;
      }

      if (method === 'REACHABILITY') {
        endpoint = '/api/device-status/reachability/retrieve';
        data = await apiClient.getReachabilityStatus(payload);
      } else if (method === 'ROAMING') {
        endpoint = '/api/device-status/roaming/retrieve';
        data = await apiClient.getRoamingStatus(payload);
      }

      setTestResult({
        method: `POST ${method.toLowerCase()}`,
        endpoint,
        status: 200,
        data: data,
        success: true,
      });
    } catch (err: any) {
      setTestResult({
        method,
        endpoint: '/api/device-status',
        status: err.status || 500,
        error: err.message,
        success: false,
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Helper to get display status from CAMARA response
  const getDisplayStatus = (result: ReachabilityResult) => {
    // Prefer legacy field if present (backwards compatibility)
    if (result.reachabilityStatus) {
      return result.reachabilityStatus;
    }
    // Convert CAMARA format to display string
    if (result.reachable === false) {
      return 'NOT_CONNECTED';
    }
    if (result.connectivity?.includes('DATA')) {
      return 'CONNECTED_DATA';
    }
    if (result.connectivity?.includes('SMS')) {
      return 'CONNECTED_SMS';
    }
    return result.reachable ? 'CONNECTED' : 'UNKNOWN';
  };

  // Get status color based on connectivity
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'CONNECTED_DATA':
      case 'CONNECTED':
        return 'text-green-600';
      case 'CONNECTED_SMS':
        return 'text-yellow-600';
      case 'NOT_CONNECTED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'CONNECTED_DATA':
      case 'CONNECTED':
        return '📶';
      case 'CONNECTED_SMS':
        return '💬';
      case 'NOT_CONNECTED':
        return '📵';
      default:
        return '❓';
    }
  };

  const currentResult = activeTab === 'reachability' ? reachabilityResult : roamingResult;

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-md p-6">

        {/* API Metrics */}
        <ApiMetrics apiName="Device Status" />

        {/* View Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewTab('flow')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewTab === 'flow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flow Sequence
            </button>
            <button
              onClick={() => setViewTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {viewTab === 'overview' && (
        <>
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('reachability')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reachability'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📶 Reachability Status
          </button>
          <button
            onClick={() => setActiveTab('roaming')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'roaming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🌍 Roaming Status
          </button>
        </div>

        <form className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device IP Address
            </label>
            {ueList.length > 0 ? (
              <select
                value={formData.deviceIp}
                onChange={(e) => handleUeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              >
                {ueList.map((ue) => (
                  <option key={ue.supi} value={ue.ipAddress}>
                    {ue.ipAddress} ({ue.msisdn})
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
            <p className="mt-1 text-xs text-gray-500">
              Select a registered UE from CoreSim
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (optional, for validation)
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+336100000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              E.164 format phone number for additional device identification
            </p>
          </div>

          <div>
            {activeTab === 'reachability' ? (
              <button
                type="button"
                onClick={handleGetReachability}
                disabled={loading || !formData.deviceIp}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Checking Reachability...' : '📶 Get Reachability Status'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGetRoaming}
                disabled={loading || !formData.deviceIp}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Checking Roaming...' : '🌍 Get Roaming Status'}
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <div className="flex items-start">
              <strong className="font-bold mr-2">Error: </strong>
              <div>
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reachability' && reachabilityResult && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                📶 Reachability Status (CAMARA Compliant)
              </h3>
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
                  {JSON.stringify(reachabilityResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {/* CAMARA Reachable field */}
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Reachable:</span>
                  <span className={`font-semibold ${reachabilityResult.reachable ? 'text-green-600' : 'text-red-600'}`}>
                    {reachabilityResult.reachable ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                {/* CAMARA Connectivity array */}
                {reachabilityResult.connectivity && reachabilityResult.connectivity.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Connectivity:</span>
                    <span className="font-semibold text-blue-600">
                      {reachabilityResult.connectivity.map(c => c === 'DATA' ? '📶 DATA' : '💬 SMS').join(', ')}
                    </span>
                  </div>
                )}
                {/* Display status (derived from CAMARA fields) */}
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Status:</span>
                  <span className={`font-semibold ${getStatusColor(getDisplayStatus(reachabilityResult))}`}>
                    {getStatusIcon(getDisplayStatus(reachabilityResult))} {getDisplayStatus(reachabilityResult)}
                  </span>
                </div>
                {reachabilityResult.lastStatusTime && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Last Status Time:</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {new Date(reachabilityResult.lastStatusTime).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-xs text-blue-700">
                    <strong>CAMARA Response Format:</strong><br />
                    • reachable: boolean - overall device reachability<br />
                    • connectivity: [&quot;DATA&quot;] / [&quot;SMS&quot;] / [&quot;DATA&quot;, &quot;SMS&quot;]<br />
                    • lastStatusTime: RFC 3339 timestamp
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roaming' && roamingResult && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                🌍 Roaming Status
              </h3>
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
                  {JSON.stringify(roamingResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Roaming:</span>
                  <span className={`font-semibold ${roamingResult.roaming ? 'text-yellow-600' : 'text-green-600'}`}>
                    {roamingResult.roaming ? '🌐 Yes - Device is roaming' : '🏠 No - Device is on home network'}
                  </span>
                </div>
                {roamingResult.countryCode && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Country Code (MCC):</span>
                    <span className="text-gray-900 font-mono">{roamingResult.countryCode}</span>
                  </div>
                )}
                {roamingResult.countryName && roamingResult.countryName.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Country:</span>
                    <span className="text-gray-900">{roamingResult.countryName.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* API Testing Section */}
      {/* <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Test API Endpoints</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => testEndpoint('REACHABILITY')}
            disabled={testLoading || !formData.deviceIp}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            📶 POST Reachability Status
          </button>
          <button
            onClick={() => testEndpoint('ROAMING')}
            disabled={testLoading || !formData.deviceIp}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            🌍 POST Roaming Status
          </button>
        </div>

        {!formData.deviceIp && (
          <p className="text-sm text-gray-500 italic">
            Select a device to test the device status endpoints
          </p>
        )}

        {testResult && (
          <div className={`mt-4 p-4 rounded-md border ${
            testResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">
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

      {/* Status Legend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Status Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Reachability Status Values</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <span>📶</span>
                <span className="font-medium text-gray-900">CONNECTED_DATA</span>
                <span className="text-gray-600">- Full connectivity</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <span>💬</span>
                <span className="font-medium text-gray-900">CONNECTED_SMS</span>
                <span className="text-gray-600">- SMS only</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <span>📵</span>
                <span className="font-medium text-gray-900">NOT_CONNECTED</span>
                <span className="text-gray-600">- Offline</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Roaming Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <span>🏠</span>
                <span className="font-medium text-gray-900">Not Roaming</span>
                <span className="text-gray-600">- Home network</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <span>🌐</span>
                <span className="font-medium text-gray-900">Roaming</span>
                <span className="text-gray-600">- Foreign network</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        </>
        )}

        {/* Flow Sequence Tab */}
        {viewTab === 'flow' && (
        <div>
          {showVisualization && currentResult ? (
            <EnhancedNetworkFlow
              apiType="device-status"
              requestData={requestData}
              responseData={currentResult}
              onComplete={() => {}}
            />
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg mb-2">No flow sequence available</p>
              <p className="text-gray-500 text-sm">Check device status first to view the network flow visualization</p>
            </div>
          )}
        </div>
        )}

        {/* Logs Tab */}
        {viewTab === 'logs' && (
        <div className="space-y-6">
          <LogsViewer apiName="Device Status" />
          <CoreLogsViewer apiName="Device Status" />
        </div>
        )}
      </div>
    </div>
  );
}
