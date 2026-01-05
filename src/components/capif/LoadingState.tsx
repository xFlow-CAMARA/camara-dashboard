import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-3 text-gray-600">Loading services...</span>
    </div>
  );
}
