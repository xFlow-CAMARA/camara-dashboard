'use client';

import Layout from '@/components/Layout';
import TrafficInfluencePanel from '@/components/TrafficInfluencePanel';

export default function TrafficInfluencePage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Traffic Influence</h1>
          <p className="text-gray-600 mt-1">Steer application traffic to edge computing resources</p>
        </div>

        <div className="w-full">
          <TrafficInfluencePanel />
        </div>
      </div>
    </Layout>
  );
}
