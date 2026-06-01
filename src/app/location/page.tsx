'use client';

import Layout from '@/components/Layout';
import LocationPanel from '@/components/LocationPanel';
import NotSupportedBanner from '@/components/NotSupportedBanner';

export default function LocationPage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Location</h1>
          <p className="text-gray-600 mt-1">Retrieve real-time location information for connected devices</p>
        </div>
        <NotSupportedBanner apiId="location">
          <div className="w-full">
            <LocationPanel />
          </div>
        </NotSupportedBanner>
      </div>
    </Layout>
  );
}
