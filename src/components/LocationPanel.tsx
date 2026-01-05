'use client';

import { useState, useEffect, useRef } from 'react';
import { LocationResponse } from '@/lib/types/camara';
import { apiClient } from '@/lib/api-client';
import EnhancedNetworkFlow from './EnhancedNetworkFlow';

// Dynamically import Leaflet to avoid SSR issues
let L: any = null;
if (typeof window !== 'undefined') {
  import('leaflet').then((leaflet) => {
    L = leaflet.default;
  });
}

export default function LocationPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ueList, setUeList] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [formData, setFormData] = useState({
    networkAccessIdentifier: '',
    maxAge: 60,
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
          // Convert format from {imsi, ip} to {supi, ipAddress}
          const formattedUes = coresim.ues.map((ue: any) => ({
            supi: ue.imsi,
            ipAddress: ue.ip,
          }));
          setUeList(formattedUes);
          // Set first UE as default only once on initial load
          if (!hasSetInitialUe.current && !formData.networkAccessIdentifier) {
            setFormData(prev => ({ ...prev, networkAccessIdentifier: formattedUes[0].supi }));
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

  // Initialize map when shown and Leaflet is loaded
  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstanceRef.current) return;

    // Add Leaflet CSS
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Wait a bit for Leaflet to be fully loaded
    const initMap = () => {
      if (!L) {
        setTimeout(initMap, 100);
        return;
      }

      try {
        // Initialize map centered on Lyon, France (where the simulated locations are)
        const map = L.map(mapRef.current).setView([45.76, 4.86], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);

        // Force a resize to ensure proper rendering
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [showMap]);

  // Update map when location result changes
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !result || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach((marker: any) => marker.remove());
    markersRef.current = [];

    const map = mapInstanceRef.current;

    if (result.area.areaType === 'CIRCLE' && 'center' in result.area) {
      // Draw circle
      const circle = L.circle(
        [result.area.center.latitude, result.area.center.longitude],
        {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          radius: result.area.radius
        }
      ).addTo(map);
      markersRef.current.push(circle);

      // Add marker at center
      const marker = L.marker([result.area.center.latitude, result.area.center.longitude])
        .addTo(map)
        .bindPopup(`
          <strong>Device Location</strong><br/>
          Lat: ${result.area.center.latitude.toFixed(6)}<br/>
          Lon: ${result.area.center.longitude.toFixed(6)}<br/>
          Radius: ${result.area.radius}m<br/>
          Time: ${new Date(result.lastLocationTime).toLocaleString()}
        `);
      markersRef.current.push(marker);

      // Fit map to circle bounds
      map.fitBounds(circle.getBounds(), { padding: [50, 50] });
    } 
    else if (result.area.areaType === 'POLYGON' && 'boundary' in result.area) {
      // Draw polygon
      const latLngs = result.area.boundary.map(point => [point.latitude, point.longitude]);
      const polygon = L.polygon(latLngs, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.2
      }).addTo(map);
      markersRef.current.push(polygon);

      // Add marker at centroid
      const bounds = polygon.getBounds();
      const center = bounds.getCenter();
      const marker = L.marker([center.lat, center.lng])
        .addTo(map)
        .bindPopup(`
          <strong>Device Location (Polygon)</strong><br/>
          ${result.area.boundary.length} boundary points<br/>
          Time: ${new Date(result.lastLocationTime).toLocaleString()}
        `);
      markersRef.current.push(marker);

      // Fit map to polygon bounds
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [result, mapReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowVisualization(true);

    const reqPayload = {
      device: {
        networkAccessIdentifier: formData.networkAccessIdentifier,
      },
      maxAge: formData.maxAge,
    };
    setRequestData(reqPayload);

    try {
      const data = await apiClient.getLocation(reqPayload);
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
      const url = `/api/location`;
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: {
            networkAccessIdentifier: formData.networkAccessIdentifier,
          },
          maxAge: formData.maxAge,
        }),
      };

      const response = await fetch(url, options);
      const data = await response.json();

      setTestResult({
        method: 'POST',
        endpoint: url,
        status: response.status,
        data: data,
        success: response.ok,
      });
    } catch (err: any) {
      setTestResult({
        method: 'POST',
        endpoint: '/api/location',
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
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Device Location</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Network Access Identifier (IMSI/SUPI)
          </label>
          {ueList.length > 0 ? (
            <select
              value={formData.networkAccessIdentifier}
              onChange={(e) =>
                setFormData({ ...formData, networkAccessIdentifier: e.target.value })
              }
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
          <p className="mt-1 text-xs text-gray-700">
            The unique identifier for the device (SUPI/IMSI format)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Max Age (seconds)
          </label>
          <input
            type="number"
            value={formData.maxAge}
            onChange={(e) => setFormData({ ...formData, maxAge: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            min="10"
            max="3600"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Getting Location...' : 'Get Device Location'}
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
            <h3 className="text-lg font-semibold text-green-800">✓ Location Retrieved</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
              <button
                onClick={() => setShowJson(!showJson)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>
          </div>

          {/* Interactive Map */}
          {showMap && (
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-300">
              {!mapReady && (
                <div className="bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
                  <div className="text-gray-600">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm">Loading map...</p>
                  </div>
                </div>
              )}
              <div 
                ref={mapRef} 
                style={{ height: '400px', width: '100%', display: mapReady ? 'block' : 'none' }}
                className="bg-gray-100"
              />
              <div className="bg-blue-50 p-2 text-xs text-blue-800 border-t border-blue-200">
                📍 Interactive map showing device location area. 
                Blue = Circle area, Green = Polygon area. Click marker for details.
              </div>
            </div>
          )}

          {showJson ? (
            <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
              <pre className="text-sm text-green-300 font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-800">Last Location Time:</span>
                <div className="text-gray-900 mt-1">
                  {new Date(result.lastLocationTime).toLocaleString()}
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-800">Area Type:</span>
                <div className="text-gray-900 mt-1">{result.area.areaType}</div>
              </div>

              {result.area.areaType === 'CIRCLE' && 'center' in result.area && (
                <div>
                  <span className="font-medium text-gray-800">Center:</span>
                  <div className="text-gray-900 mt-1 font-mono text-xs">
                    Lat {result.area.center.latitude.toFixed(6)}, Lon {result.area.center.longitude.toFixed(6)}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium text-gray-800">Radius:</span>
                    <span className="text-gray-900 ml-2">{result.area.radius} meters</span>
                  </div>
                </div>
              )}

              {result.area.areaType === 'POLYGON' && 'boundary' in result.area && (
                <div>
                  <span className="font-medium text-gray-800">Boundary Points:</span>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {result.area.boundary.map((point: { latitude: number; longitude: number }, index: number) => (
                      <div key={index} className="bg-white text-gray-700 p-2 rounded border border-gray-200">
                        <span className="font-mono text-xs">
                          Point {index + 1}: Lat {point.latitude.toFixed(6)}, Lon{' '}
                          {point.longitude.toFixed(6)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> The location API supports both CIRCLE and POLYGON area types. CIRCLE provides center coordinates and radius, while POLYGON provides boundary points.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* API Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Test API Endpoint</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => testEndpoint('POST')}
            disabled={testLoading || !formData.networkAccessIdentifier}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            POST Retrieve Location
          </button>
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed text-sm font-medium"
            title="Location verification API (future endpoint)"
          >
            POST Location Verification (Coming Soon)
          </button>
        </div>

        {!formData.networkAccessIdentifier && (
          <p className="text-sm text-gray-500 italic">
            Select a device identifier to test the location endpoint
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
          apiType="location" 
          requestData={requestData}
          responseData={result}
          onComplete={() => {}}
        />
      )}
    </div>
  );
}
