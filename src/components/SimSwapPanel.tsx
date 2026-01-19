'use client';

import { useState, useEffect, useRef } from 'react';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { apiClient } from '@/lib/api-client';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';

interface SimSwapCheckResult {
  swapped: boolean;
}

interface SimSwapDateResult {
  latestSimChange: string | null;
  monitoredPeriod?: number;
}

export default function SimSwapPanel() {
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<SimSwapCheckResult | null>(null);
  const [dateResult, setDateResult] = useState<SimSwapDateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ueList, setUeList] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'check' | 'retrieve'>('check');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const [formData, setFormData] = useState({
    phoneNumber: '',
    maxAge: 240,
  });

  // Use a string-backed input state so users can edit freely (allow empty while typing)
  const [maxAgeInput, setMaxAgeInput] = useState<string>(String(formData.maxAge));

  // Keep the input representation in sync with the canonical numeric value
  useEffect(() => {
    setMaxAgeInput(String(formData.maxAge ?? 240));
  }, [formData.maxAge]);

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
          if (!hasSetInitialUe.current && !formData.phoneNumber) {
            setFormData(prev => ({
              ...prev,
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
  const handleUeSelect = (msisdn: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: msisdn,
    }));
  };

  // Check SIM Swap
  const handleCheckSimSwap = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setCheckResult(null);
    setDateResult(null);
    setShowVisualization(true);

    const reqPayload = {
      phoneNumber: formData.phoneNumber,
      maxAge: formData.maxAge,
    };

    setRequestData(reqPayload);

    try {
      const data = await apiClient.checkSimSwap(reqPayload);
      setCheckResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Retrieve SIM Swap Date
  const handleRetrieveDate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setCheckResult(null);
    setDateResult(null);
    setShowVisualization(true);

    const reqPayload = {
      phoneNumber: formData.phoneNumber,
    };

    setRequestData(reqPayload);

    try {
      const data = await apiClient.retrieveSimSwapDate(reqPayload);
      setDateResult(data);
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

      if (method === 'CHECK') {
        endpoint = '/api/sim-swap/check';
        const payload = {
          phoneNumber: formData.phoneNumber,
          maxAge: formData.maxAge,
        };
        data = await apiClient.checkSimSwap(payload);
      } else if (method === 'RETRIEVE') {
        endpoint = '/api/sim-swap/retrieve-date';
        const payload = {
          phoneNumber: formData.phoneNumber,
        };
        data = await apiClient.retrieveSimSwapDate(payload);
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
        endpoint: '/api/sim-swap',
        status: err.status || 500,
        error: err.message,
        success: false,
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Calculate time since swap
  const getTimeSinceSwap = (dateStr: string) => {
    const swapDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - swapDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} months ago`;
    }
  };

  // Get risk level and color
  const getRiskInfo = (swapped: boolean, dateStr?: string | null) => {
    if (swapped) {
      return { level: 'HIGH', color: 'red', icon: '🚨', message: 'SIM swap detected - fraud risk!' };
    }
    if (dateStr) {
      const swapDate = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - swapDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 24) {
        return { level: 'HIGH', color: 'red', icon: '🚨', message: 'SIM swapped within 24 hours!' };
      } else if (diffHours < 72) {
        return { level: 'MEDIUM', color: 'yellow', icon: '⚠️', message: 'SIM swapped within 3 days' };
      } else if (diffHours < 240) {
        return { level: 'ELEVATED', color: 'orange', icon: '⚡', message: 'SIM swapped within 10 days' };
      }
    }
    return { level: 'LOW', color: 'green', icon: '✅', message: 'No recent SIM swap' };
  };

  const currentResult = activeTab === 'check' ? checkResult : dateResult;

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-lg shadow-md p-6">

        {/* API Metrics */}
        <ApiMetrics apiName="SIM Swap" />

        {/* Request Logs */}
        <LogsViewer apiName="SIM Swap" />

        {/* Core Network Logs */}
        <CoreLogsViewer apiName="SIM Swap" />

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('check')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'check'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Check SIM Swap
          </button>
          <button
            onClick={() => setActiveTab('retrieve')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'retrieve'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Retrieve Swap Date
          </button>
        </div>

        <form className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (E.164 format)
            </label>
            {ueList.length > 0 ? (
              <select
                value={formData.phoneNumber}
                onChange={(e) => handleUeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              >
                {ueList.map((ue) => (
                  <option key={ue.supi} value={ue.msisdn}>
                    {ue.msisdn} ({ue.ipAddress})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder="+346661113334"
                required
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              Select a registered UE from CoreSim
            </p>
          </div>

          {activeTab === 'check' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Age (hours to check for SIM swap)
              </label>
              <input
                type="number"
                value={maxAgeInput}
                onChange={(e) => setMaxAgeInput(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val === '' || isNaN(Number(val))) {
                    setMaxAgeInput('240');
                    setFormData({ ...formData, maxAge: 240 });
                    return;
                  }
                  let n = Number(val);
                  if (n < 1) n = 1;
                  if (n > 2400) n = 2400;
                  setMaxAgeInput(String(n));
                  setFormData({ ...formData, maxAge: n });
                }}
                min={1}
                max={2400}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                Check for SIM swaps in the last N hours (1-2400, default: 240 = 10 days)
              </p>
            </div>
          )}

          <div>
            {activeTab === 'check' ? (
              <button
                type="button"
                onClick={handleCheckSimSwap}
                disabled={loading || !formData.phoneNumber}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Checking SIM Swap...' : '🔍 Check SIM Swap'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRetrieveDate}
                disabled={loading || !formData.phoneNumber}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Retrieving Date...' : '📅 Retrieve Swap Date'}
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

        {activeTab === 'check' && checkResult && (
          <div className={`border rounded-md p-4 mb-4 ${
            checkResult.swapped 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {checkResult.swapped ? '🚨' : '✅'} SIM Swap Check Result
              </h3>
              <button
                onClick={() => setShowJson(!showJson)}
                className={`px-3 py-1 text-sm text-white rounded hover:opacity-80 transition-colors ${
                  checkResult.swapped ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>

            {showJson ? (
              <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                <pre className="text-sm text-green-300 font-mono">
                  {JSON.stringify(checkResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">SIM Swapped:</span>
                  <span className={`font-semibold ${checkResult.swapped ? 'text-red-600' : 'text-green-600'}`}>
                    {checkResult.swapped ? '🚨 Yes - SIM swap detected!' : '✅ No - No recent swap'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Period Checked:</span>
                  <span className="text-gray-900">{formData.maxAge} hours ({Math.round(formData.maxAge / 24)} days)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Risk Level:</span>
                  <span className={`font-semibold ${
                    getRiskInfo(checkResult.swapped).color === 'red' ? 'text-red-600' :
                    getRiskInfo(checkResult.swapped).color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {getRiskInfo(checkResult.swapped).icon} {getRiskInfo(checkResult.swapped).level}
                  </span>
                </div>
                {checkResult.swapped && (
                  <div className="p-3 bg-red-100 rounded-md">
                    <p className="text-xs text-red-800">
                      <strong>⚠️ Fraud Prevention Alert:</strong><br />
                      A SIM swap was detected. Consider additional verification before proceeding with sensitive operations like password resets or high-value transactions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'retrieve' && dateResult && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                📅 SIM Swap Date Information
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
                  {JSON.stringify(dateResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Latest SIM Change:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {dateResult.latestSimChange 
                      ? new Date(dateResult.latestSimChange).toLocaleString()
                      : 'No data available'}
                  </span>
                </div>
                {dateResult.latestSimChange && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Time Since Swap:</span>
                    <span className="text-gray-900">{getTimeSinceSwap(dateResult.latestSimChange)}</span>
                  </div>
                )}
                {dateResult.monitoredPeriod && (
                  <div className="flex justify-between items-center p-3 bg-white rounded-md">
                    <span className="font-medium text-gray-800">Monitored Period:</span>
                    <span className="text-gray-900">{dateResult.monitoredPeriod} days</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-white rounded-md">
                  <span className="font-medium text-gray-800">Risk Assessment:</span>
                  {(() => {
                    const risk = getRiskInfo(false, dateResult.latestSimChange);
                    return (
                      <span className={`font-semibold ${
                        risk.color === 'red' ? 'text-red-600' :
                        risk.color === 'yellow' ? 'text-yellow-600' :
                        risk.color === 'orange' ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {risk.icon} {risk.level} - {risk.message}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* API Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Test API Endpoints</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => testEndpoint('CHECK')}
            disabled={testLoading || !formData.phoneNumber}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            🔍 POST Check SIM Swap
          </button>
          <button
            onClick={() => testEndpoint('RETRIEVE')}
            disabled={testLoading || !formData.phoneNumber}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            📅 POST Retrieve Date
          </button>
        </div>

        {!formData.phoneNumber && (
          <p className="text-sm text-gray-500 italic">
            Select a device to test the SIM swap endpoints
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
      </div>

      {/* Status Reference */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Status Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Risk Levels</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <span>🚨</span>
                <span className="font-medium text-gray-900">HIGH RISK</span>
                <span className="text-gray-600">- SIM swap &lt; 24 hours</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <span>⚠️</span>
                <span className="font-medium text-gray-900">MEDIUM RISK</span>
                <span className="text-gray-600">- SIM swap &lt; 3 days</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                <span>⚡</span>
                <span className="font-medium text-gray-900">ELEVATED</span>
                <span className="text-gray-600">- SIM swap &lt; 10 days</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <span>✅</span>
                <span className="font-medium text-gray-900">LOW RISK</span>
                <span className="text-gray-600">- No recent swap</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Use Cases</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <span>🏦</span>
                <span className="font-medium text-gray-900">Banking</span>
                <span className="text-gray-600">- Verify before transactions</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                <span>🔐</span>
                <span className="font-medium text-gray-900">2FA</span>
                <span className="text-gray-600">- Strengthen SMS OTP</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <span>📱</span>
                <span className="font-medium text-gray-900">Account Recovery</span>
                <span className="text-gray-600">- Extra verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Flow Visualization */}
      {showVisualization && (
        <EnhancedNetworkFlow
          apiType="sim-swap"
          requestData={requestData}
          responseData={currentResult}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}
