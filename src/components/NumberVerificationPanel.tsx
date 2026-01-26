'use client';

import { useState, useEffect, useRef } from 'react';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';
import { apiClient } from '@/lib/api-client';
import ApiMetrics from './ApiMetrics';
import LogsViewer from './LogsViewer';
import CoreLogsViewer from './CoreLogsViewer';

interface NumberVerificationResult {
  devicePhoneNumberVerified?: boolean;
  devicePhoneNumber?: string;
}

export default function NumberVerificationPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NumberVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ueList, setUeList] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  
  // View tab state
  const [viewTab, setViewTab] = useState<'overview' | 'flow' | 'logs'>('overview');

  const [formData, setFormData] = useState({
    phoneNumber: '',
    deviceIp: '',
    hashedPhoneNumber: '',
    useHashed: false,
  });

  // Hash calculator state
  const [hashInput, setHashInput] = useState('');
  const [calculatedHash, setCalculatedHash] = useState('');

  // Track if we've already set the initial UE
  const hasSetInitialUe = useRef(false);

  // Fetch UEs from CoreSim on mount
  useEffect(() => {
    const fetchUes = async () => {
      try {
        const data = await apiClient.getCores();
        const coresim = data.cores?.find((c: any) => c.name === 'coresim');
        if (coresim?.ues && coresim.ues.length > 0) {
          // Convert format from {imsi, ip, msisdn} to our format
          // Generate MSISDN from IMSI: +336 + last 8 digits of IMSI (matching backend logic)
          const formattedUes = coresim.ues.map((ue: any) => {
            const imsi = ue.imsi || '';
            // Extract last 8 digits of IMSI for MSISDN (E.164 format)
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
            setHashInput(formattedUes[0].msisdn);
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

  // Calculate SHA-256 hash of phone number
  const calculateHash = async (phone: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(phone);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleCalculateHash = async () => {
    if (hashInput) {
      const hash = await calculateHash(hashInput);
      setCalculatedHash(hash);
      setFormData(prev => ({ ...prev, hashedPhoneNumber: hash }));
    }
  };

  // Handle UE selection
  const handleUeSelect = (ipAddress: string) => {
    const selectedUe = ueList.find(ue => ue.ipAddress === ipAddress);
    if (selectedUe) {
      setFormData(prev => ({
        ...prev,
        deviceIp: ipAddress,
        phoneNumber: selectedUe.msisdn,
      }));
      setHashInput(selectedUe.msisdn);
    }
  };

  // Verify phone number
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowVisualization(true);

    const reqPayload: any = {
      device: {
        ipv4Address: {
          publicAddress: formData.deviceIp,
        },
      },
    };

    if (formData.useHashed) {
      reqPayload.hashedPhoneNumber = formData.hashedPhoneNumber;
    } else {
      reqPayload.phoneNumber = formData.phoneNumber;
    }

    setRequestData(reqPayload);

    try {
      const data = await apiClient.verifyPhoneNumber(reqPayload);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get device phone number
  const handleGetPhoneNumber = async () => {
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
    };
    setRequestData(reqPayload);

    try {
      const data = await apiClient.getDevicePhoneNumber(formData.deviceIp);

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (method: string) => {
    setTestLoading(true);
    setTestResult(null);

    try {
      let data: any;
      let endpoint = '';

      if (method === 'VERIFY') {
        endpoint = '/api/number-verification/verify';
        const payload: any = {
          device: {
            ipv4Address: {
              publicAddress: formData.deviceIp,
            },
          },
        };
        if (formData.useHashed) {
          payload.hashedPhoneNumber = formData.hashedPhoneNumber;
        } else {
          payload.phoneNumber = formData.phoneNumber;
        }
        data = await apiClient.verifyPhoneNumber(payload);
      } else if (method === 'SHARE') {
        endpoint = `/api/number-verification/device-phone-number?deviceIp=${formData.deviceIp}`;
        data = await apiClient.getDevicePhoneNumber(formData.deviceIp);
      }

      setTestResult({
        method: method === 'VERIFY' ? 'POST /verify' : 'GET /device-phone-number',
        endpoint,
        status: 200,
        data: data,
        success: true,
      });
    } catch (err: any) {
      setTestResult({
        method,
        endpoint: '/api/number-verification',
        status: err.status || 500,
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
        {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Number Verification</h2> */}

        {/* API Metrics */}
        <ApiMetrics apiName="Number Verification" />

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
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
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

          {/* Plain or Hashed Toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!formData.useHashed}
                onChange={() => setFormData(prev => ({ ...prev, useHashed: false }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Plain text phone number</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.useHashed}
                onChange={() => setFormData(prev => ({ ...prev, useHashed: true }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Hashed phone number (SHA-256)</span>
            </label>
          </div>

          {!formData.useHashed ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number to Verify (E.164 format)
              </label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+336100000000"
                pattern="^\+[1-9][0-9]{4,14}$"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: + followed by country code and number (CoreSim: +336100000XXX)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hashed Phone Number (SHA-256 hex)
                </label>
                <input
                  type="text"
                  value={formData.hashedPhoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, hashedPhoneNumber: e.target.value }))}
                  placeholder="64-character hex string"
                  pattern="^[a-fA-F0-9]{64}$"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  required
                />
              </div>

              {/* Hash Calculator */}
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hash Calculator (for testing)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="+33600000001"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleCalculateHash}
                    className="px-4 py-2 text-sm bg-gray-600 text-white hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Calculate & Use
                  </button>
                </div>
                {calculatedHash && (
                  <p className="mt-2 text-xs text-gray-600 font-mono break-all">
                    Hash: {calculatedHash}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Phone Number'}
            </button>
            <button
              type="button"
              onClick={handleGetPhoneNumber}
              disabled={loading || !formData.deviceIp}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Retrieving...' : 'Get Device Phone Number'}
            </button>
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

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-green-800">
                {result.devicePhoneNumberVerified !== undefined ? '✓ Verification Complete' : '✓ Phone Number Retrieved'}
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
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {result.devicePhoneNumberVerified !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">Verification Status:</span>
                    <span className={result.devicePhoneNumberVerified ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {result.devicePhoneNumberVerified ? '✓ Phone number verified' : '✗ Phone number does not match'}
                    </span>
                  </div>
                )}
                {result.devicePhoneNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">Device Phone Number:</span>
                    <span className="text-gray-900 font-mono">{result.devicePhoneNumber}</span>
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
            onClick={() => testEndpoint('VERIFY')}
            disabled={testLoading || !formData.deviceIp}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            POST Verify Phone Number
          </button>
          <button
            onClick={() => testEndpoint('SHARE')}
            disabled={testLoading || !formData.deviceIp}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            GET Device Phone Number
          </button>
        </div>

        {!formData.deviceIp && (
          <p className="text-sm text-gray-500 italic">
            Select a device to test the number verification endpoints
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

        {/* Flow Sequence Tab */}
        {viewTab === 'flow' && (
        <div>
          {showVisualization && result ? (
            <EnhancedNetworkFlow
              apiType="number-verification"
              requestData={requestData}
              responseData={result}
              onComplete={() => {}}
            />
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg mb-2">No flow sequence available</p>
              <p className="text-gray-500 text-sm">Verify a phone number first to view the network flow visualization</p>
            </div>
          )}
        </div>
        )}

        {/* Logs Tab */}
        {viewTab === 'logs' && (
        <div className="space-y-6">
          <LogsViewer apiName="Number Verification" />
          <CoreLogsViewer apiName="Number Verification" />
        </div>
        )}
      </div>
    </div>
  );
}
