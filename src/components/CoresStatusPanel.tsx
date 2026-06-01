'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface CoreInfo {
  name: string;
  displayName: string;
  connected: boolean;
  hasConfig: boolean;
  status: string;
  initialized: boolean;
  type?: string;
  config?: {
    simulationProfile?: {
      plmn?: { mcc: string; mnc: string };
      dnn?: string;
      slice?: { sst: number; sd: string };
      numOfUe?: number;
      numOfgNB?: number;
      arrivalRate?: number;
    };
  };
  networkFunctions?: Array<{
    name: string;
    endpoint: string;
    description: string;
  }>;
  ranSimulator?: {
    type: string;
    container: string;
    configPath?: string;
    config?: any; // Full gnbsim YAML config - structure varies
  };
  ues?: Array<{
    imsi: string;
    ip: string;
  }>;
}

interface CoresResponse {
  cores: CoreInfo[];
}

export default function CoresStatusPanel() {
  const [coresData, setCoresData] = useState<CoresResponse | null>(null);
  const [activeCore, setActiveCore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCore, setEditingCore] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  const [restartingCore, setRestartingCore] = useState<string | null>(null);
  const [restartStatus, setRestartStatus] = useState<string>('');

  const fetchCores = async () => {
    try {
      // Add cache busting to ensure fresh data
      const [coresResponse, activeResponse] = await Promise.all([
        apiClient.getCores(),
        apiClient.getActiveCore()
      ]);
      setCoresData(coresResponse);
      setActiveCore(activeResponse.activeCore);
    } catch (error) {
      console.error('Failed to fetch cores:', error);
      setCoresData(null); // Clear old data on error
      setActiveCore(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCores();
    const interval = setInterval(fetchCores, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (core: CoreInfo) => {
    setEditingCore(core.name);
    setEditForm({
      mcc: core.config?.simulationProfile?.plmn?.mcc || '',
      mnc: core.config?.simulationProfile?.plmn?.mnc || '',
      numOfUe: core.config?.simulationProfile?.numOfUe || 0,
      numOfgNB: core.config?.simulationProfile?.numOfgNB || 0,
      dnn: core.config?.simulationProfile?.dnn || '',
      sst: core.config?.simulationProfile?.slice?.sst || 1,
      sd: core.config?.simulationProfile?.slice?.sd || '',
      arrivalRate: core.config?.simulationProfile?.arrivalRate || 0,
    });
  };

  const handleSave = async () => {
    if (!editingCore) return;
    
    setSaving(true);
    setRestartingCore(editingCore);
    setRestartStatus('Saving configuration...');
    
    try {
      const response = await apiClient.updateCoreConfig(editingCore, {
        simulationProfile: {
          plmn: { mcc: editForm.mcc, mnc: editForm.mnc },
          numOfUe: parseInt(editForm.numOfUe),
          numOfgNB: parseInt(editForm.numOfgNB),
          dnn: editForm.dnn,
          slice: { sst: parseInt(editForm.sst), sd: editForm.sd },
          arrivalRate: parseInt(editForm.arrivalRate),
        }
      });

      if (response.restart_failed) {
        setRestartStatus('Config saved but restart failed');
        alert(response.message);
        setRestartingCore(null);
      } else {
        setRestartStatus('Restarting core-simulator...');
        // Poll for core status
        await pollCoreStatus(editingCore);
      }

      setEditingCore(null);
    } catch (error) {
      console.error('Failed to save config:', error);
      setRestartStatus('Failed to save configuration');
      alert('Failed to save configuration');
      setRestartingCore(null);
    } finally {
      setSaving(false);
    }
  };

  const pollCoreStatus = async (coreName: string) => {
    const maxAttempts = 10; // 10 attempts (20 seconds total)
    const pollInterval = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setRestartStatus(`Verifying restart (${attempt}/${maxAttempts})...`);
      
      try {
        // Fetch fresh data each time
        const freshData = await apiClient.getCores();
        const currentCore = freshData?.cores?.find((c: any) => c.name === coreName);
        
        // Accept both RUNNING and CONFIGURED states as success after restart
        if (currentCore?.connected && (currentCore?.status === 'RUNNING' || currentCore?.status === 'CONFIGURED')) {
          setRestartStatus('✓ Restart successful!');
          await fetchCores(); // Final refresh to update UI
          setTimeout(() => {
            setRestartingCore(null);
            setRestartStatus('');
          }, 2000);
          return;
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // If we get here, timeout occurred
    setRestartStatus('Restart completed - refreshing...');
    await fetchCores(); // Final refresh
    setTimeout(() => {
      setRestartingCore(null);
      setRestartStatus('');
    }, 2000);
  };

  const handleControl = async (coreName: string, action: 'start' | 'stop') => {
    setControlLoading(`${coreName}-${action}`);
    try {
      await apiClient.controlCoreSimulator(action);
      const delay = action === 'start' ? 12000 : 2000;
      setTimeout(() => {
        fetchCores();
        setControlLoading(null);
      }, delay);
    } catch (error: any) {
      console.error(`Failed to ${action} core:`, error);
      alert(`Failed to ${action} ${coreName}: ${error.message}`);
      setControlLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-gray-700 text-xl font-semibold mb-4">5G Cores</h2>
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow text-gray-700">
        <h2 className="text-gray-700 text-xl font-semibold mb-4">Available 5G Cores</h2>
        
        {coresData && coresData.cores.length > 0 ? (
          <div className="space-y-3">
            {coresData.cores.map((core) => (
              <div key={core.name} className="border rounded-lg">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      core.connected ? 'bg-green-500' : 
                      core.hasConfig ? 'bg-yellow-500' : 
                      'bg-gray-300'
                    }`} />
                    <div>
                      <h3 className="font-medium">{core.displayName}</h3>
                      <p className="text-sm text-gray-700">
                        {core.connected ? (
                          <span className="text-green-600">Connected - {core.status}</span>
                        ) : core.hasConfig ? (
                          <span className="text-yellow-600">Configured but not running</span>
                        ) : (
                          <span className="text-gray-600">Not configured</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {core.hasConfig && core.type === 'simulator' && (
                      <button
                        onClick={() => handleEdit(core)}
                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Edit Config
                      </button>
                    )}
                    {core.connected && core.type === 'simulator' && (
                      <>
                        <button
                          onClick={() => handleControl(core.name, 'stop')}
                          disabled={controlLoading !== null}
                          className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {controlLoading === `${core.name}-stop` ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Stopping...
                            </span>
                          ) : 'Stop'}
                        </button>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          ACTIVE
                        </span>
                      </>
                    )}
                    {!core.connected && core.hasConfig && core.type === 'simulator' && (
                      <>
                        <button
                          onClick={() => handleControl(core.name, 'start')}
                          disabled={controlLoading !== null}
                          className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {controlLoading === `${core.name}-start` ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Starting...
                            </span>
                          ) : 'Start'}
                        </button>
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          READY
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {core.config?.simulationProfile && core.name === activeCore && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {core.config.simulationProfile.plmn && (
                          <div>
                            <span className="text-gray-600">PLMN:</span>{' '}
                            <span className="font-mono">
                              {core.config.simulationProfile.plmn.mcc}-{core.config.simulationProfile.plmn.mnc}
                            </span>
                          </div>
                        )}
                        {core.config.simulationProfile.numOfUe !== undefined && (
                          <div>
                            <span className="text-gray-600">UEs:</span>{' '}
                            <span className="font-semibold">{core.config.simulationProfile.numOfUe}</span>
                          </div>
                        )}
                        {core.config.simulationProfile.numOfgNB !== undefined && (
                          <div>
                            <span className="text-gray-600">gNBs:</span>{' '}
                            <span className="font-semibold">{core.config.simulationProfile.numOfgNB}</span>
                          </div>
                        )}
                        {core.config.simulationProfile.dnn && (
                          <div>
                            <span className="text-gray-600">DNN:</span>{' '}
                            <span className="font-mono">{core.config.simulationProfile.dnn}</span>
                          </div>
                        )}
                        {core.config.simulationProfile.slice && (
                          <div>
                            <span className="text-gray-600">Slice:</span>{' '}
                            <span className="font-mono">
                              SST:{core.config.simulationProfile.slice.sst}/SD:{core.config.simulationProfile.slice.sd}
                            </span>
                          </div>
                        )}
                        {core.config.simulationProfile.arrivalRate !== undefined && (
                          <div>
                            <span className="text-gray-600">Arrival Rate:</span>{' '}
                            <span className="font-semibold">{core.config.simulationProfile.arrivalRate}/s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}



                {/* RAN Simulator Info */}
                {core.ranSimulator && core.name === activeCore && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-green-50 rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <span>📡 RAN Simulator</span>
                        <span className="text-xs font-normal text-gray-600">({core.ranSimulator.type})</span>
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between bg-white px-2 py-1 rounded">
                          <span className="text-gray-600">Container:</span>
                          <span className="font-mono text-gray-900">{core.ranSimulator.container}</span>
                        </div>
                        {core.ranSimulator.config && core.ranSimulator.config.configuration && (
                          <>
                            {core.ranSimulator.config.configuration.gnbs && Object.keys(core.ranSimulator.config.configuration.gnbs).length > 0 && (
                              (() => {
                                const gnb = Object.values(core.ranSimulator.config.configuration.gnbs)[0] as any;
                                const plmn = gnb?.globalRanId?.plmnId;
                                const gnbId = gnb?.globalRanId?.gNbId?.gNBValue;
                                return (
                                  <>
                                    {plmn && (
                                      <div className="flex justify-between bg-white px-2 py-1 rounded">
                                        <span className="text-gray-600">PLMN:</span>
                                        <span className="font-mono text-gray-900">
                                          {plmn.mcc}-{plmn.mnc}
                                        </span>
                                      </div>
                                    )}
                                    {gnbId && (
                                      <div className="flex justify-between bg-white px-2 py-1 rounded">
                                        <span className="text-gray-600">gNB ID:</span>
                                        <span className="font-mono text-gray-900">{gnbId}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            )}
                            {core.ranSimulator.config.configuration.profiles && core.ranSimulator.config.configuration.profiles.length > 0 && (
                              (() => {
                                const profile = core.ranSimulator.config.configuration.profiles[0];
                                return (
                                  <>
                                    {profile.dnn && (
                                      <div className="flex justify-between bg-white px-2 py-1 rounded">
                                        <span className="text-gray-600">DNN:</span>
                                        <span className="font-mono text-gray-900">{profile.dnn}</span>
                                      </div>
                                    )}
                                    {profile.ueCount !== undefined && (
                                      <div className="flex justify-between bg-white px-2 py-1 rounded">
                                        <span className="text-gray-600">Simulated UEs:</span>
                                        <span className="font-semibold text-green-700">{profile.ueCount}</span>
                                      </div>
                                    )}
                                    {profile.startImsi && (
                                      <div className="mt-2 pt-2 border-t border-green-200">
                                        <p className="text-xs text-gray-600">
                                          <span className="font-semibold">IMSI Base:</span>{' '}
                                          <span className="font-mono">{profile.startImsi}</span>
                                        </p>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            )}
                          </>
                        )}
                      </div>
                      {core.ranSimulator.configPath && (
                        <div className="mt-2 text-xs text-gray-600 italic">
                          💡 Config: {core.ranSimulator.configPath.split('/').pop()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {core.ues && core.ues.length > 0 && core.name === activeCore && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="bg-blue-50 rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Available UEs ({core.ues.length})</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {core.ues.map((ue) => (
                          <div key={ue.imsi} className="flex justify-between text-xs font-mono bg-white px-2 py-1 rounded">
                            <span className="text-gray-600">{ue.imsi}</span>
                            <span className="text-blue-600">{ue.ip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-700">No 5G cores available</p>
        )}
        
        <div className="mt-4 pt-4 border-t text-sm text-gray-700">
          <p>💡 Tip: Only connected cores can be used for CAMARA API operations</p>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingCore(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Edit Core Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MCC</label>
                <input
                  type="text"
                  value={editForm.mcc}
                  onChange={(e) => setEditForm({...editForm, mcc: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                  placeholder="001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MNC</label>
                <input
                  type="text"
                  value={editForm.mnc}
                  onChange={(e) => setEditForm({...editForm, mnc: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                  placeholder="01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of UEs</label>
                <input
                  type="number"
                  value={editForm.numOfUe}
                  onChange={(e) => setEditForm({...editForm, numOfUe: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of gNBs</label>
                <input
                  type="number"
                  value={editForm.numOfgNB}
                  onChange={(e) => setEditForm({...editForm, numOfgNB: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNN</label>
                <input
                  type="text"
                  value={editForm.dnn}
                  onChange={(e) => setEditForm({...editForm, dnn: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                  placeholder="intenet"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Rate (/s)</label>
                <input
                  type="number"
                  value={editForm.arrivalRate}
                  onChange={(e) => setEditForm({...editForm, arrivalRate: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slice SST</label>
                <input
                  type="number"
                  value={editForm.sst}
                  onChange={(e) => setEditForm({...editForm, sst: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slice SD</label>
                <input
                  type="text"
                  value={editForm.sd}
                  onChange={(e) => setEditForm({...editForm, sd: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-gray-800"
                  placeholder="FFFFFF"
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Changes will be saved and the core simulator will restart automatically to apply the new configuration.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingCore(null)}
                disabled={saving}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Status Modal */}
      {restartingCore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Restarting Core Simulator</h3>
              <p className="text-gray-600 text-center mb-4">{restartStatus}</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
