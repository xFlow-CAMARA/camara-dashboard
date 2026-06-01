'use client';

import Layout from '@/components/Layout';
import DeviceStatusPanel from '@/components/DeviceStatusPanel';
import NotSupportedBanner from '@/components/NotSupportedBanner';

export default function DeviceStatusPage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Status</h1>
          <p className="text-gray-600 mt-1">Check device reachability and roaming status using CAMARA APIs</p>
        </div>
        <NotSupportedBanner apiId="device-status">
          <div className="w-full">
            <DeviceStatusPanel />
          </div>
        </NotSupportedBanner>
      </div>
    </Layout>
  );
}
