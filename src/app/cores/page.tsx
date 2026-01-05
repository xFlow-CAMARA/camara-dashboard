'use client';

import Layout from '@/components/Layout';
import CoresStatusPanel from '@/components/CoresStatusPanel';

export default function CoresPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">5G Core Management</h1>
          <p className="text-gray-600 mt-1">
            Configure and monitor your 5G core network instances. 
            Switch between cores using the selector in the header.
          </p>
        </div>

        <CoresStatusPanel />

        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📘 Configuration Guide</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-medium">Editing Configuration:</p>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Click &ldquo;Edit Config&rdquo; to modify simulation parameters</li>
                <li>• Adjust number of UEs, gNBs, arrival rate, and network identifiers</li>
                <li>• Changes are saved to the configuration file immediately</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Applying Changes:</p>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Restart the core-simulator container after saving</li>
                <li>• Start a new simulation to see updated metrics</li>
                <li>• Monitor Grafana dashboard for real-time data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
