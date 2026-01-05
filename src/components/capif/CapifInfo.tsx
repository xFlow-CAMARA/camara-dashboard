import React from 'react';

export default function CapifInfo() {
  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="font-semibold text-blue-900 mb-2">About Service Registry</h3>
      <p className="text-sm text-blue-800 mb-3">
        This service registry provides a standardized approach to publish, discover, and manage
        APIs in 5G networks. It shows all APIs registered by NEF services and exposed through
        the API Gateway, supporting both CAMARA and 3GPP specifications.
      </p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-blue-900">Specifications:</span>
          <span className="text-blue-800 ml-2">CAMARA, 3GPP TS 29.122/29.522</span>
        </div>
        <div>
          <span className="font-medium text-blue-900">Source:</span>
          <span className="text-blue-800 ml-2 font-mono">TF-SDK Registry (port 8200)</span>
        </div>
      </div>
    </div>
  );
}
