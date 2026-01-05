'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface UEInfo {
  supi: string;
  ipAddress: string;
  dnn?: string;
  snssai?: string;
}

interface CoreSimData {
  status: string;
  ues: UEInfo[];
  config: {
    plmn?: { mcc: string; mnc: string };
    dnn?: string;
    numOfGnbs?: number;
    [key: string]: any;
  };
  available: boolean;
}

interface HealthData {
  services: {
    coresim: { available: boolean };
    qod: { available: boolean };
    location: { available: boolean };
    trafficInfluence: { available: boolean };
  };
}

export default function CoreSimStatus() {
  const [coreSimData, setCoreSimData] = useState<CoreSimData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch both CoreSim detailed status and health status
        const [coreSimResult, healthResult] = await Promise.all([
          apiClient.getCoreSimStatus(),
          apiClient.getHealth('coresim'),
        ]);

        setCoreSimData(coreSimResult);
        setHealthData(healthResult);
      } catch (error) {
        setCoreSimData({ available: false, status: 'ERROR', ues: [], config: {} });
        setHealthData({ services: { coresim: { available: false }, qod: { available: false }, location: { available: false }, trafficInfluence: { available: false } } });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const isRunning = coreSimData?.available;
  const simStatus = coreSimData?.status;
  const ues = coreSimData?.ues || [];
  const plmn = coreSimData?.config?.plmn;
  const dnn = coreSimData?.config?.dnn || 'internet';
  const numGnbs = coreSimData?.config?.numOfGnbs || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">CoreSim Status</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Simulator:</span>
          {loading ? (
            <span className="text-gray-600">Checking...</span>
          ) : isRunning ? (
            <span className="text-green-600 font-semibold">{simStatus}</span>
          ) : (
            <span className="text-red-600 font-semibold">Offline</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Active UEs:</span>
          <span className="text-gray-900">{ues.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">gNBs:</span>
          <span className="text-gray-900">{numGnbs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">PLMN:</span>
          <span className="text-gray-900 font-mono">
            {plmn ? `${plmn.mcc}-${plmn.mnc}` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">DNN:</span>
          <span className="text-gray-900">{dnn}</span>
        </div>
      </div>

      {!loading && !isRunning && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            ⚠️ CoreSim is not running. Start it with:
            <code className="block mt-1 bg-yellow-100 px-2 py-1 rounded font-mono text-xs">
              docker start core-simulator
            </code>
          </p>
        </div>
      )}
      
      {isRunning && ues.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Available UEs</h4>
          <div className="space-y-1 text-xs font-mono text-gray-900 max-h-40 overflow-y-auto">
            {ues.map((ue, index) => (
              <div key={ue.supi || index} className="flex justify-between">
                <span className="truncate mr-2">{ue.supi}</span>
                <span className="text-gray-900">{ue.ipAddress}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isRunning && ues.length === 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-700 italic">No UEs configured</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 text-gray-900">
        <h4 className="text-sm font-medium text-gray-800 mb-2">NEF Services</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span>QoD (8100)</span>
            <span className={`px-2 py-0.5 rounded ${healthData?.services?.qod?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {healthData?.services?.qod?.available ? '●' : '○'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Location (8102)</span>
            <span className={`px-2 py-0.5 rounded ${healthData?.services?.location?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {healthData?.services?.location?.available ? '●' : '○'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Traffic Influence (8101)</span>
            <span className={`px-2 py-0.5 rounded ${healthData?.services?.trafficInfluence?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {healthData?.services?.trafficInfluence?.available ? '●' : '○'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
