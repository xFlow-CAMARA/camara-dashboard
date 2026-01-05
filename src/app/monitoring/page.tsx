'use client';

import Layout from '@/components/Layout';
import MonitoringPanel from '@/components/MonitoringPanel';

export default function MonitoringPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time metrics and analytics for your 5G core network</p>
        </div>

        <MonitoringPanel />
      </div>
    </Layout>
  );
}
