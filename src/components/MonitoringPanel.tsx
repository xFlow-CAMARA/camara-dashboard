'use client';

export default function MonitoringPanel() {
  const grafanaUrl = 'http://192.168.20.171:3000';
  const dashboardUrl = 'http://192.168.20.171:3000/d/5g-core-sim/5g-core-simulator-dashboard';
  const embedUrl = 'http://192.168.20.171:3000/d/5g-core-sim/5g-core-simulator-dashboard?orgId=1&refresh=5s&kiosk';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">System Monitoring</h2>

      {/* Monitoring info */}
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-2">5G Core Simulator</h3>
        <p className="text-sm text-gray-600 mb-3">Real-time 5G Core Network Metrics</p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Grafana Dashboard:</span>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Open Dashboard →
            </a>
          </div>
        </div>
      </div>

      {/* Embedded Grafana iframe */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Live Dashboard Preview - 5G Core Simulator
            </span>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Open in new tab ↗
            </a>
          </div>
        </div>
        <div className="relative bg-gray-50" style={{ height: '600px' }}>
          <iframe
            src={embedUrl}
            className="w-full h-full"
            frameBorder="0"
            title="5G Core Simulator Grafana Dashboard"
            allow="fullscreen"
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-md p-3">
          <div className="text-xs font-medium text-blue-700 mb-1">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-900">Online</span>
          </div>
        </div>
        <div className="bg-purple-50 rounded-md p-3">
          <div className="text-xs font-medium text-purple-700 mb-1">Metrics</div>
          <span className="text-sm font-semibold text-gray-900">Real-time</span>
        </div>
      </div>

      {/* Info notice */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> Default Grafana credentials are admin/admin. 
          You may need to log in on first access.
        </p>
      </div>
    </div>
  );
}
