/**
 * CAPIF (Common API Framework) Client
 * Fetches registered service endpoints from the CAPIF service registry
 * 3GPP TS 23.222 - Common API Framework for 3GPP Northbound APIs
 */

const CAPIF_BASE_URL = process.env.NEXT_PUBLIC_CAPIF_URL || 'http://localhost:8200';

export interface ServiceEndpoint {
  serviceApiId: string;
  serviceName: string;
  apiName: string;
  apiVersion: string;
  protocol: string;
  dataFormat: string;
  interfaceDescriptions: Array<{
    ipv4Addr?: string;
    port?: number;
    apiPrefix?: string;
    securityMethods?: string[];
  }>;
  resourcePaths?: string[];
}

export interface RegisteredService {
  apiId: string;
  apiName: string;
  version: string;
  baseUrl: string;
  endpoints: {
    [key: string]: {
      method: string;
      path: string;
      description: string;
    };
  };
}

class CapifClient {
  private cache: Map<string, RegisteredService> = new Map();
  private cacheExpiry: number = 60000; // 1 minute cache
  private lastFetch: number = 0;

  /**
   * Fetch all registered services from CAPIF
   */
  async getRegisteredServices(): Promise<RegisteredService[]> {
    const now = Date.now();
    if (now - this.lastFetch < this.cacheExpiry && this.cache.size > 0) {
      return Array.from(this.cache.values());
    }

    try {
      const response = await fetch(`${CAPIF_BASE_URL}/services`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn('CAPIF service unavailable, using fallback endpoints');
        return this.getFallbackServices();
      }

      const services = await response.json();
      this.processServices(services);
      this.lastFetch = now;
      
      return Array.from(this.cache.values());
    } catch (error) {
      console.warn('Failed to fetch from CAPIF:', error);
      return this.getFallbackServices();
    }
  }

  /**
   * Get a specific service endpoint by API name
   */
  async getServiceEndpoint(apiName: string): Promise<RegisteredService | null> {
    await this.getRegisteredServices();
    return this.cache.get(apiName) || null;
  }

  /**
   * Get endpoint for a specific operation
   */
  async getOperationEndpoint(
    apiName: string,
    operation: string
  ): Promise<{ method: string; url: string } | null> {
    const service = await this.getServiceEndpoint(apiName);
    if (!service || !service.endpoints[operation]) {
      return null;
    }

    const endpoint = service.endpoints[operation];
    return {
      method: endpoint.method,
      url: `${service.baseUrl}${endpoint.path}`,
    };
  }

  private processServices(services: any[]) {
    this.cache.clear();
    
    services.forEach((service: any) => {
      const registered: RegisteredService = {
        apiId: service.apiId || service.serviceApiId,
        apiName: service.apiName || service.serviceName,
        version: service.apiVersion || service.version || 'v1',
        baseUrl: this.extractBaseUrl(service),
        endpoints: this.extractEndpoints(service),
      };
      
      this.cache.set(registered.apiName, registered);
    });
  }

  private extractBaseUrl(service: any): string {
    // Extract from interface descriptions
    if (service.interfaceDescriptions && service.interfaceDescriptions.length > 0) {
      const iface = service.interfaceDescriptions[0];
      const host = iface.ipv4Addr || 'localhost';
      const port = iface.port || 8080;
      const prefix = iface.apiPrefix || '';
      return `http://${host}:${port}${prefix}`;
    }
    
    // Fallback
    return service.baseUrl || 'http://localhost:8080';
  }

  private extractEndpoints(service: any): RegisteredService['endpoints'] {
    const endpoints: RegisteredService['endpoints'] = {};
    
    // Parse resource paths if available
    if (service.aefProfiles) {
      service.aefProfiles.forEach((aef: any) => {
        if (aef.versions) {
          aef.versions.forEach((version: any) => {
            if (version.resources) {
              version.resources.forEach((resource: any) => {
                const opName = resource.resourceName || resource.uri;
                endpoints[opName] = {
                  method: resource.operations?.[0] || 'POST',
                  path: resource.uri || '/',
                  description: resource.description || '',
                };
              });
            }
          });
        }
      });
    }
    
    return endpoints;
  }

  /**
   * Fallback services when CAPIF is unavailable
   * These should match the actual deployed services
   */
  private getFallbackServices(): RegisteredService[] {
    return [
      {
        apiId: 'qod-api',
        apiName: '3gpp-as-session-with-qos',
        version: 'v1',
        baseUrl: 'http://3gpp-as-session-with-qos:8100',
        endpoints: {
          createSession: {
            method: 'POST',
            path: '/3gpp-as-session-with-qos/v1/nef/subscriptions',
            description: 'Create QoS session with guaranteed bandwidth',
          },
          getSession: {
            method: 'GET',
            path: '/3gpp-as-session-with-qos/v1/nef/subscriptions/{subscriptionId}',
            description: 'Get QoS session details',
          },
          deleteSession: {
            method: 'DELETE',
            path: '/3gpp-as-session-with-qos/v1/nef/subscriptions/{subscriptionId}',
            description: 'Delete QoS session',
          },
        },
      },
      {
        apiId: 'location-api',
        apiName: '3gpp-monitoring-event',
        version: 'v1',
        baseUrl: 'http://3gpp-monitoring-event:8102',
        endpoints: {
          createSubscription: {
            method: 'POST',
            path: '/3gpp-monitoring-event/v1/nef/subscriptions',
            description: 'Subscribe to UE location monitoring events',
          },
          getSubscription: {
            method: 'GET',
            path: '/3gpp-monitoring-event/v1/nef/subscriptions/{subscriptionId}',
            description: 'Get location subscription details',
          },
        },
      },
      {
        apiId: 'traffic-api',
        apiName: '3gpp-traffic-influence',
        version: 'v1',
        baseUrl: 'http://3gpp-traffic-influence:8101',
        endpoints: {
          createSubscription: {
            method: 'POST',
            path: '/3gpp-traffic-influence/v1/nef/subscriptions',
            description: 'Create traffic influence subscription',
          },
          getSubscription: {
            method: 'GET',
            path: '/3gpp-traffic-influence/v1/nef/subscriptions/{subscriptionId}',
            description: 'Get traffic influence details',
          },
        },
      },
      {
        apiId: 'core-network',
        apiName: 'core-network-service',
        version: 'v1',
        baseUrl: 'http://core-network-service:9090',
        endpoints: {
          pcfPolicyAuth: {
            method: 'POST',
            path: '/npcf-policyauthorization/v1/app-sessions',
            description: '3GPP TS 29.514 PCF Policy Authorization',
          },
          amfEvents: {
            method: 'POST',
            path: '/namf-evts/v1/subscriptions',
            description: '3GPP TS 29.518 AMF Event Exposure',
          },
        },
      },
      {
        apiId: 'coresim',
        apiName: 'core-simulator',
        version: 'v1',
        baseUrl: 'http://core-simulator:8080',
        endpoints: {
          smfPduSession: {
            method: 'POST',
            path: '/nsmf-pdusession/v1/sm-contexts',
            description: '3GPP TS 29.502 SMF PDU Session',
          },
          status: {
            method: 'GET',
            path: '/core-simulator/v1/status',
            description: 'Get CoreSim simulation status',
          },
        },
      },
      {
        apiId: 'tf-sdk',
        apiName: 'tf-sdk-api',
        version: 'v1',
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
        endpoints: {
          qodSessions: {
            method: 'POST',
            path: '/quality-on-demand/v1/sessions',
            description: 'CAMARA QoD API - Create QoS session',
          },
          locationRetrieval: {
            method: 'POST',
            path: '/location-retrieval/v0/retrieve',
            description: 'CAMARA Location API - Retrieve device location',
          },
          trafficInfluence: {
            method: 'POST',
            path: '/traffic-influence/v1/subscriptions',
            description: 'CAMARA Traffic Influence API',
          },
          numberVerification: {
            method: 'POST',
            path: '/number-verification/vwip/verify',
            description: 'CAMARA Number Verification API - Verify phone number',
          },
          devicePhoneNumber: {
            method: 'GET',
            path: '/number-verification/vwip/device-phone-number',
            description: 'CAMARA Number Verification API - Get device phone number',
          },
        },
      },
      {
        apiId: 'ue-identity',
        apiName: 'ue-identity-service',
        version: 'v1',
        baseUrl: 'http://ue-identity-service:8103',
        endpoints: {
          getUeByIp: {
            method: 'GET',
            path: '/ue?ip={ip}',
            description: 'Get UE info by IP address',
          },
          getMsisdnByIp: {
            method: 'GET',
            path: '/msisdn?ip={ip}',
            description: 'Get MSISDN (phone number) by IP address',
          },
        },
      },
    ];
  }
}

// Export singleton instance
export const capifClient = new CapifClient();
