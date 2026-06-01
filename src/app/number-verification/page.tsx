'use client';

import Layout from '@/components/Layout';
import NumberVerificationPanel from '@/components/NumberVerificationPanel';
import NotSupportedBanner from '@/components/NotSupportedBanner';

export default function NumberVerificationPage() {
  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Number Verification</h1>
          <p className="text-gray-600 mt-1">Verify phone numbers using the CAMARA Number Verification API</p>
        </div>
        <NotSupportedBanner apiId="number-verification">
          <NumberVerificationPanel />
        </NotSupportedBanner>
      </div>
    </Layout>
  );
}
