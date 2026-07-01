'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ErrorMessage from '@/components/capif/ErrorMessage';
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

  const camaraCount = services.filter(s => s.apiType === 'CAMARA').length;
  const otherCount  = services.length - camaraCount;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Hero bento */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.7fr_0.7fr] gap-4">
          <div className="card-lg p-8 lg:p-10 relative overflow-hidden">
            <p className="eyebrow mb-4">Discovery</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[0.92] tracking-[-0.035em] text-ink" style={{ fontWeight: 800 }}>
              Service<br />registry.
            </h1>
            <p className="mt-4 text-[14px] text-ink-2 max-w-md">
              Every CAMARA API and supporting service published into the CAPIF registry, with endpoints, version, and provenance.
            </p>
            <div className="mt-6">
              <button onClick={fetchServices} disabled={refreshing} className="btn-pill-ghost">
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {/* decorative nodes */}
            <svg className="absolute -right-10 -bottom-12 opacity-10" width="220" height="220" viewBox="0 0 220 220" aria-hidden>
              <g stroke="var(--ink)" strokeWidth="1.2" fill="none">
                <circle cx="40"  cy="40"  r="6" />
                <circle cx="180" cy="40"  r="6" />
                <circle cx="110" cy="110" r="8" />
                <circle cx="40"  cy="180" r="6" />
                <circle cx="180" cy="180" r="6" />
                <path d="M40 40 L110 110 L180 40 M110 110 L40 180 M110 110 L180 180" />
              </g>
            </svg>
          </div>

          <div className="card-blue rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4" style={{ color: 'rgba(11,13,16,0.55)' }}>CAMARA</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em] text-ink" style={{ fontWeight: 800 }}>
                {camaraCount}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                APIs published
              </p>
            </div>
          </div>

          <div className="card-cream rounded-lg p-7 flex flex-col justify-between">
            <p className="eyebrow mb-4">Other</p>
            <div>
              <p className="font-display text-[64px] leading-none tracking-[-0.04em]" style={{ fontWeight: 800, color: 'var(--accent-violet)' }}>
                {otherCount}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] font-mono text-ink-2">
                services
              </p>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <div className="card-lg py-16 text-center text-ink-3 font-mono uppercase tracking-[0.18em] text-[13px]">
            Loading registry…
          </div>
        ) : services.length === 0 ? (
          <div className="card-lg py-16 px-8 text-center">
            <h2 className="font-display text-[28px] tracking-[-0.025em] mb-2" style={{ fontWeight: 800 }}>
              Empty registry.
            </h2>
            <p className="text-[13px] text-ink-3 max-w-md mx-auto">
              No services have been published to CAPIF yet. Once <span className="font-mono">capif-service</span> registers the CAMARA APIs they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* CAMARA APIs */}
            {camaraCount > 0 && (
              <section className="card-lg p-7 lg:p-8">
                <div className="flex items-baseline justify-between mb-5">
                  <div>
                    <p className="eyebrow">Standard</p>
                    <h2 className="font-display text-[28px] tracking-[-0.025em] mt-1" style={{ fontWeight: 800 }}>
                      CAMARA APIs.
                    </h2>
                    <p className="text-[13px] text-ink-3 mt-1">Standardized Network APIs from the CAMARA project</p>
                  </div>
                  <span className="status-pill" style={{ background: 'var(--moss-bg)', color: 'var(--moss)' }}>
                    <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--moss)' }} />
                    {camaraCount} published
                  </span>
                </div>
                <div className="grid gap-4">
                  {services.filter(s => s.apiType === 'CAMARA').map(s => (
                    <ServiceCard key={s.serviceId} service={s} />
                  ))}
                </div>
              </section>
            )}

            {/* Other services */}
            {otherCount > 0 && (
              <section className="card-lg p-7 lg:p-8">
                <div className="flex items-baseline justify-between mb-5">
                  <div>
                    <p className="eyebrow">Auxiliary</p>
                    <h2 className="font-display text-[28px] tracking-[-0.025em] mt-1" style={{ fontWeight: 800 }}>
                      Other services.
                    </h2>
                    <p className="text-[13px] text-ink-3 mt-1">Additional registered services and APIs</p>
                  </div>
                  <span className="status-pill" style={{ background: 'var(--card-soft)', color: 'var(--ink-2)' }}>
                    <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-violet)' }} />
                    {otherCount} services
                  </span>
                </div>
                <div className="grid gap-4">
                  {services.filter(s => s.apiType !== 'CAMARA').map(s => (
                    <ServiceCard key={s.serviceId} service={s} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <CapifInfo />
      </div>
    </Layout>
  );
}
