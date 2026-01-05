import React from 'react';
import { CheckCircle, Clock, ExternalLink, FileText, BookOpen } from 'lucide-react';

interface ServiceAPIDescription {
  apiId: string;
  apiName: string;
  apiVersion?: string;
  apiStatus?: string;
  description?: string;
  aefProfiles?: Array<{
    aefId: string;
    versions: Array<{
      apiVersion: string;
      resources?: Array<{
        resourceName: string;
        commType: string;
        uri: string;
        operations: string[];
      }>;
    }>;
    protocol?: string;
    dataFormat?: string;
    interfaceDescriptions?: Array<{
      ipv4Addr?: string;
      port?: number;
      securityMethods?: string[];
    }>;
  }>;
  pubApiPath?: {
    ccfIds?: string[];
  };
  shareableInfo?: {
    isShareable: boolean;
    capifProvDoms?: string[];
  };
}

interface RegisteredService {
  serviceId: string;
  serviceName: string;
  serviceType?: string;
  apiDefinition: ServiceAPIDescription;
  registeredAt?: string;
  status?: string;
  apiType?: string;
  release?: string;
  specification?: string;
  specUrl?: string;
  discoveryStatus?: string;
  discoveredApis?: Array<{
    name: string;
    path: string;
    spec: string;
  }>;
  camaraApis?: {
    qualityOnDemand?: {
      spec: string;
      openapi: string;
      release?: string;
    };
    deviceLocation?: {
      spec: string;
      openapi: string;
      release?: string;
    };
    trafficInfluence?: {
      spec: string;
      openapi: string;
      release?: string;
    };
    numberVerification?: {
      spec: string;
      openapi: string;
      release?: string;
    };
  };
  endpoints?: {
    [key: string]: {
      method: string;
      path: string;
      description?: string;
      interactsWith?: string[];
    };
  };
  resourcesUsed?: string[];
  networkFunctions?: Array<{
    name: string;
    description: string;
    usedBy: string[];
    status?: string;
  }>;
}

interface ServiceCardProps {
  service: RegisteredService;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-600">{service.serviceName}</h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${service.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {service.status || 'ACTIVE'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {service.serviceId}
              </span>
              {/* {service.apiDefinition?.apiVersion && (
                <span>Version: {service.apiDefinition.apiVersion}</span>
              )} */}
              {service.apiType && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {service.apiType}
                </span>
              )}
              {service.release && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {service.release}
                </span>
              )}
              {service.specification && (
                <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  {service.specification}
                </span>
              )}
              {/* {service.registeredAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(service.registeredAt).toLocaleString()}
                </span>
              )} */}
            </div>
            {service.specUrl && (
              <div className="mt-2">
                <a
                  href={service.specUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View OpenAPI Specification
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {service.camaraApis && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-semibold text-gray-600 mb-1">CAMARA API Specifications:</div>
                {service.camaraApis.qualityOnDemand && (
                  <div className="flex gap-3 items-center">
                    <a
                      href={service.camaraApis.qualityOnDemand.spec}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      Quality on Demand
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    {service.camaraApis.qualityOnDemand.release && (
                      <span className="text-xs text-gray-500">({service.camaraApis.qualityOnDemand.release})</span>
                    )}
                    <a
                      href={service.camaraApis.qualityOnDemand.openapi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      OpenAPI
                    </a>
                  </div>
                )}
                {service.camaraApis.deviceLocation && (
                  <div className="flex gap-3 items-center">
                    <a
                      href={service.camaraApis.deviceLocation.spec}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      Device Location
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    {service.camaraApis.deviceLocation.release && (
                      <span className="text-xs text-gray-500">({service.camaraApis.deviceLocation.release})</span>
                    )}
                    <a
                      href={service.camaraApis.deviceLocation.openapi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      OpenAPI
                    </a>
                  </div>
                )}
                {service.camaraApis.trafficInfluence && (
                  <div className="flex gap-3 items-center">
                    <a
                      href={service.camaraApis.trafficInfluence.spec}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      Traffic Influence
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    {service.camaraApis.trafficInfluence.release && (
                      <span className="text-xs text-gray-500">({service.camaraApis.trafficInfluence.release})</span>
                    )}
                    <a
                      href={service.camaraApis.trafficInfluence.openapi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      OpenAPI
                    </a>
                  </div>
                )}
                {service.camaraApis.numberVerification && (
                  <div className="flex gap-3 items-center">
                    <a
                      href={service.camaraApis.numberVerification.spec}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <BookOpen className="w-3 h-3" />
                      Number Verification
                      <ExternalLink className="w-2 h-2" />
                    </a>
                    {service.camaraApis.numberVerification.release && (
                      <span className="text-xs text-gray-500">({service.camaraApis.numberVerification.release})</span>
                    )}
                    <a
                      href={service.camaraApis.numberVerification.openapi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      <FileText className="w-3 h-3" />
                      OpenAPI
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {service.apiDefinition?.description && (
          <p className="text-gray-700 mb-4">{service.apiDefinition.description}</p>
        )}

        {service.discoveredApis && service.discoveredApis.length > 0 && (
          <div className="mt-4 mb-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Discovered APIs ({service.discoveredApis.length})
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="space-y-2">
                {service.discoveredApis.map((api, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs">
                    <div className="flex-1">
                      <span className="font-medium text-green-900">{api.name}</span>
                      <span className="text-green-700 ml-2">{api.path}</span>
                    </div>
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded">
                      {api.spec}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {service.discoveryStatus && (
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${service.discoveryStatus === 'available'
                ? 'bg-green-100 text-green-800'
                : service.discoveryStatus === 'detected'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
              <CheckCircle className="w-3 h-3" />
              Discovery: {service.discoveryStatus}
            </span>
          </div>
        )}

        {/* Resources Used Section */}
        {service.resourcesUsed && service.resourcesUsed.length > 0 && (
          <div className="mt-4 mb-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Resources Used</h4>
            <div className="flex flex-wrap gap-2">
              {service.resourcesUsed.map((resource, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200"
                >
                  {resource}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Network Functions Section */}
        {service.networkFunctions && service.networkFunctions.length > 0 && (
          <div className="mt-4 mb-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Network Functions</h4>
            <div className="space-y-2">
              {service.networkFunctions.map((nf, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${nf.status?.includes('active')
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{nf.name}</span>
                      {nf.status && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${nf.status.includes('active')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {nf.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{nf.description}</p>
                  {nf.usedBy && nf.usedBy.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="font-medium">Used by:</span>
                      <span>{nf.usedBy.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Endpoints Section */}
        {service.endpoints && Object.keys(service.endpoints).length > 0 && (
          <div className="mt-4 mb-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">API Endpoints</h4>
            <div className="space-y-2">
              {Object.entries(service.endpoints).map(([key, endpoint]) => (
                <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold rounded bg-blue-100 text-blue-800">
                      {endpoint.method}
                    </span>
                    <div className="flex-1">
                      <code className="text-xs text-gray-700 font-mono">{endpoint.path}</code>
                      {endpoint.description && (
                        <p className="text-xs text-gray-600 mt-1">{endpoint.description}</p>
                      )}
                      {endpoint.interactsWith && endpoint.interactsWith.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <span className="text-gray-500">Interacts with:</span>
                          <div className="flex flex-wrap gap-1">
                            {endpoint.interactsWith.map((resource, idx) => (
                              <span
                                key={idx}
                                className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
                              >
                                {resource}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {service.apiDefinition?.aefProfiles && service.apiDefinition.aefProfiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">AEF Profiles</h4>
            <div className="space-y-3">
              {service.apiDefinition.aefProfiles.map((aef, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900">AEF ID: {aef.aefId}</span>
                      {aef.protocol && (
                        <span className="ml-3 text-sm text-gray-600">Protocol: {aef.protocol}</span>
                      )}
                      {aef.dataFormat && (
                        <span className="ml-3 text-sm text-gray-600">Format: {aef.dataFormat}</span>
                      )}
                    </div>
                  </div>

                  {aef.interfaceDescriptions && aef.interfaceDescriptions.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-700">Endpoints:</span>
                      <div className="mt-1 space-y-1">
                        {aef.interfaceDescriptions.map((iface, iidx) => (
                          <div key={iidx} className="text-sm text-gray-600 flex items-center gap-2">
                            <ExternalLink className="w-3 h-3" />
                            <span className="font-mono">
                              {iface.ipv4Addr}:{iface.port}
                            </span>
                            {iface.securityMethods && iface.securityMethods.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {iface.securityMethods.join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aef.versions && aef.versions.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700">API Resources:</span>
                      {aef.versions.map((ver, vidx) => (
                        <div key={vidx} className="mt-2">
                          <span className="text-xs text-gray-600">Version: {ver.apiVersion}</span>
                          {ver.resources && ver.resources.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {ver.resources.map((res, ridx) => (
                                <div key={ridx} className="text-xs bg-white rounded px-2 py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-blue-600">{res.uri}</span>
                                    <span className="text-gray-500">({res.commType})</span>
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    {res.operations.map((op) => (
                                      <span
                                        key={op}
                                        className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium"
                                      >
                                        {op}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {service.apiDefinition?.shareableInfo?.isShareable && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span>This API is shareable across provider domains</span>
          </div>
        )}
      </div>
    </div>
  );
}
