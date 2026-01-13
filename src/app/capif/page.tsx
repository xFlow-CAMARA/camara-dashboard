'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import CapifHeader from '@/components/capif/CapifHeader';
import ErrorMessage from '@/components/capif/ErrorMessage';
import LoadingState from '@/components/capif/LoadingState';
import EmptyState from '@/components/capif/EmptyState';
import ServiceCard from '@/components/capif/ServiceCard';
import CapifInfo from '@/components/capif/CapifInfo';

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
    deviceReachabilityStatus?: {
      spec: string;
      openapi: string;
      release?: string;
    };
    deviceRoamingStatus?: {
      spec: string;
      openapi: string;
      release?: string;
    };
    simSwap?: {
      spec: string;
      openapi: string;
      release?: string;
    };
  };
}

export default function CapifServicesPage() {
  const [services, setServices] = useState<RegisteredService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch from TF-SDK CAPIF endpoint through Next.js API proxy
      const response = await fetch('/api/capif/services');

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }

      const data = await response.json();

      // Transform the response to match our interface
      const transformedServices: RegisteredService[] = Array.isArray(data)
        ? data.map((service: any) => ({
          serviceId: service.apiId || service.id || '',
          serviceName: service.apiName || service.name || 'Unknown Service',
          serviceType: service.apiType || 'API',
          apiType: service.apiType,
          release: service.release,
          specification: service.specification,
          specUrl: service.specUrl,
          camaraApis: service.camaraApis,  // Add CAMARA API specs
          apiDefinition: {
            apiId: service.apiId || '',
            apiName: service.apiName || '',
            apiVersion: service.version || 'v1',
            description: service.description || `Endpoint: ${service.baseUrl}`,
            aefProfiles: service.endpoints ? [{
              aefId: service.apiId || 'default',
              versions: [{
                apiVersion: service.version || 'v1',
                resources: Object.entries(service.endpoints || {}).map(([key, value]: [string, any]) => ({
                  resourceName: key,
                  commType: 'REQUEST_RESPONSE',
                  uri: value.path || '',
                  operations: [value.method || 'POST']
                }))
              }],
              protocol: 'HTTP_1_1',
              dataFormat: 'JSON',
              interfaceDescriptions: [{
                ipv4Addr: service.baseUrl?.replace(/https?:\/\//, '').split(':')[0],
                port: parseInt(service.baseUrl?.split(':')[2] || '8080'),
              }]
            }] : []
          },
          registeredAt: new Date().toISOString(),
          status: 'ACTIVE'
        }))
        : [];

      setServices(transformedServices);
    } catch (err) {
      console.error('Error fetching CAPIF services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <CapifHeader onRefresh={fetchServices} refreshing={refreshing} />

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <LoadingState />
        ) : services.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {/* CAMARA APIs Section */}
            {services.filter(service => service.apiType === 'CAMARA').length > 0 && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-600 mb-2">CAMARA APIs</h2>
                  <p className="text-gray-400">Standardized Network APIs from the CAMARA project</p>
                </div>
                <div className="grid gap-6">
                  {services
                    .filter(service => service.apiType === 'CAMARA')
                    .map((service) => (
                      <ServiceCard
                        key={service.serviceId}
                        service={service}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Other Services Section */}
            {services.filter(service => service.apiType !== 'CAMARA').length > 0 && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-600 mb-2">Other Services</h2>
                  <p className="text-gray-400">Additional registered services and APIs</p>
                </div>
                <div className="grid gap-6">
                  {services
                    .filter(service => service.apiType !== 'CAMARA')
                    .map((service) => (
                      <ServiceCard
                        key={service.serviceId}
                        service={service}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <CapifInfo />
      </div>
    </Layout>
  );
}
