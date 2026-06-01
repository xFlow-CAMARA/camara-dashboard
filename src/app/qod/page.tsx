'use client';

import Layout from '@/components/Layout';
import QodPanel from '@/components/QodPanel';
import NotSupportedBanner from '@/components/NotSupportedBanner';

export default function QodPage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality on Demand (QoD)</h1>
          <p className="text-gray-600 mt-1">Manage network quality and service levels for your applications</p>
        </div>
        <NotSupportedBanner apiId="qod">
          <div className="w-full">
            <QodPanel />
          </div>
        </NotSupportedBanner>
      </div>
    </Layout>
  );
}
