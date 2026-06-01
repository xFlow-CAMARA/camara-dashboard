'use client';

import Layout from '@/components/Layout';
import SimSwapPanel from '@/components/SimSwapPanel';
import NotSupportedBanner from '@/components/NotSupportedBanner';

export default function SimSwapPage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIM Swap</h1>
          <p className="text-gray-600 mt-1">Detect SIM swap fraud using CAMARA SIM Swap API</p>
        </div>
        <NotSupportedBanner apiId="sim-swap">
          <div className="w-full">
            <SimSwapPanel />
          </div>
        </NotSupportedBanner>
      </div>
    </Layout>
  );
}
