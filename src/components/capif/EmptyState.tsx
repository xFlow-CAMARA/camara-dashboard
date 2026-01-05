import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
      <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Services Registered</h3>
      <p className="text-yellow-700">
        No API services are currently registered in the service registry.
      </p>
    </div>
  );
}
