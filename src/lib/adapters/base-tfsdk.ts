import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  BackendAdapter,
  QodSession,
  QodSessionResponse,
  LocationRequest,
  LocationResponse,
  TrafficInfluenceRequest,
  TrafficInfluenceResponse,
  NumberVerificationRequest,
  NumberVerificationResponse,
  DevicePhoneNumberResponse,
  Device,
  DeviceIpv4Addr,
  normalizeDevice,
} from '../types/camara';

/**
 * Base adapter for 5G cores using TF-SDK integration.
 * Implements CAMARA-compliant API calls with proper headers and device normalization.
 * Subclasses specify which core they connect to.
 */

// Runtime function to get TF-SDK URL - avoids build-time inlining
function getTfSdkBaseUrl(): string {
  return process.env.TF_SDK_URL || process.env.NEXT_PUBLIC_API_URL || 'http://tf-sdk-api:8200';
}

export abstract class BaseTFSDKAdapter implements BackendAdapter {
  abstract name: string;
  protected abstract coreName: string;
  private client: AxiosInstance;

  constructor(baseUrl?: string) {
    this.client = axios.create({ 
      baseURL: baseUrl || getTfSdkBaseUrl(),
      timeout: 10000,
    });
  }

  /**
   * Generate CAMARA-compliant headers with x-correlator
   */
  private getHeaders(correlator?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-correlator': correlator || crypto.randomUUID(),
    };
  }

  async createQodSession(request: QodSession): Promise<QodSessionResponse> {
    // CAMARA-compliant payload construction with normalized device
    const payload: any = {
      duration: request.duration,
      qosProfile: request.qosProfile,
      applicationServer: request.applicationServer,
    };

    // Normalize and add device if provided (optional in 3-legged token flow)
    if (request.device) {
      payload.device = normalizeDevice(request.device);
    }

    // Add ports if provided (CAMARA PortsSpec format)
    if (request.devicePorts) {
      payload.devicePorts = request.devicePorts;
    }
    if (request.applicationServerPorts) {
      payload.applicationServerPorts = request.applicationServerPorts;
    }

    // Add sink and credentials if provided
    if (request.sink) {
      payload.sink = request.sink;
    }
    if (request.sinkCredential) {
      payload.sinkCredential = request.sinkCredential;
    }

    // Call CAMARA-compliant endpoint with core as query parameter
    const response = await this.client.post(
      `/quality-on-demand/v1/sessions?core=${this.coreName}`, 
      payload,
      { headers: this.getHeaders() }
    );
    
    return response.data;
  }

  async getQodSession(sessionId: string): Promise<QodSessionResponse> {
    const response = await this.client.get(
      `/quality-on-demand/v1/sessions/${sessionId}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async deleteQodSession(sessionId: string): Promise<void> {
    await this.client.delete(
      `/quality-on-demand/v1/sessions/${sessionId}`,
      { headers: this.getHeaders() }
    );
  }

  async extendQodSession(sessionId: string, additionalDuration: number): Promise<QodSessionResponse> {
    const response = await this.client.post(
      `/quality-on-demand/v1/sessions/${sessionId}/extend`,
      { requestedAdditionalDuration: additionalDuration },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async retrieveSessionsByDevice(device: any): Promise<QodSessionResponse[]> {
    // Normalize device for CAMARA compliance
    const normalizedDevice = normalizeDevice(device);
    const response = await this.client.post(
      `/quality-on-demand/v1/retrieve-sessions`,
      { device: normalizedDevice },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getLocation(request: LocationRequest): Promise<LocationResponse> {
    const payload: any = {};

    // Add device if provided
    if (request.device) {
      payload.device = request.device;
    }

    // Add optional parameters
    if (request.maxAge !== undefined) {
      payload.maxAge = request.maxAge;
    }
    if (request.maxSurface !== undefined) {
      payload.maxSurface = request.maxSurface;
    }

    // Call CAMARA-compliant location endpoint
    const response = await this.client.post(
      `/location-retrieval/v0/retrieve?core=${this.coreName}`,
      payload,
      {
        headers: {
          'x-correlator': crypto.randomUUID(),
        }
      }
    );
    return response.data;
  }

  async createTrafficInfluence(
    request: TrafficInfluenceRequest
  ): Promise<TrafficInfluenceResponse> {
    // CAMARA-compliant payload
    const payload: any = {
      apiConsumerId: 'camara-dashboard',
      appId: '550e8400-e29b-41d4-a716-446655440000', // Example app UUID
      device: {},
    };

    // Add device identifiers
    if (request.device.ipv4Address) {
      payload.device.ipv4Address = request.device.ipv4Address;
    }
    if (request.device.networkAccessIdentifier) {
      payload.device.networkAccessIdentifier = request.device.networkAccessIdentifier;
    }
    if (request.device.phoneNumber) {
      payload.device.phoneNumber = request.device.phoneNumber;
    }

    // Add optional fields
    if (request.applicationServer?.ipv4Address) {
      payload.appInstanceId = request.applicationServer.ipv4Address;
    }
    if (request.edgeCloudZoneId) {
      payload.edgeCloudZoneId = request.edgeCloudZoneId;
    }
    if (request.edgeCloudRegion) {
      payload.edgeCloudRegion = request.edgeCloudRegion;
    }

    // Add traffic filters if provided
    if (request.trafficFilters && request.trafficFilters.length > 0) {
      const filter = request.trafficFilters[0];
      if (filter.dstPort) {
        payload.destinationTrafficFilters = {
          destinationPort: filter.dstPort,
          destinationProtocol: filter.protocol || 'TCP'
        };
      }
      if (filter.srcPort) {
        payload.sourceTrafficFilters = {
          sourcePort: filter.srcPort
        };
      }
    }

    // Call CAMARA endpoint
    const response = await this.client.post(
      `/traffic-influence/vwip/traffic-influence-devices?core=${this.coreName}`,
      payload,
      {
        headers: {
          'x-correlator': crypto.randomUUID(),
        }
      }
    );
    
    // Map CAMARA response to dashboard format
    return {
      subscriptionId: response.data.trafficInfluenceID,
      device: request.device,
      applicationServer: request.applicationServer,
      trafficFilters: request.trafficFilters,
      state: response.data.state,
      createdAt: new Date().toISOString(),
    };
  }

  async getTrafficInfluence(subscriptionId: string): Promise<TrafficInfluenceResponse> {
    const response = await this.client.get(
      `/traffic-influence/vwip/traffic-influences/${subscriptionId}?core=${this.coreName}`,
      {
        headers: {
          'x-correlator': crypto.randomUUID(),
        }
      }
    );
    
    return {
      subscriptionId: response.data.trafficInfluenceID,
      device: response.data.device || {},
      applicationServer: { ipv4Address: response.data.appInstanceId || 'N/A' },
      trafficFilters: [],
      state: response.data.state,
      createdAt: new Date().toISOString(),
    };
  }

  async deleteTrafficInfluence(subscriptionId: string): Promise<void> {
    await this.client.delete(
      `/traffic-influence/vwip/traffic-influences/${subscriptionId}?core=${this.coreName}`,
      {
        headers: {
          'x-correlator': crypto.randomUUID(),
        }
      }
    );
  }

  // Core control methods
  async getCoreStatus(): Promise<any> {
    const response = await this.client.get(`/api/${this.coreName}/status`);
    return response.data;
  }

  async startSimulation(): Promise<any> {
    const response = await this.client.post(`/api/${this.coreName}/start`);
    return response.data;
  }

  async stopSimulation(): Promise<any> {
    const response = await this.client.post(`/api/${this.coreName}/stop`);
    return response.data;
  }

  // Check if this core is actually connected
  async isConnected(): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/${this.coreName}/status`);
      return response.data.available === true;
    } catch {
      return false;
    }
  }

  // Number Verification APIs
  async verifyPhoneNumber(request: NumberVerificationRequest): Promise<NumberVerificationResponse> {
    const payload: any = {};

    // Add phone number - either plain or hashed
    if (request.phoneNumber) {
      payload.phoneNumber = request.phoneNumber;
    }
    if (request.hashedPhoneNumber) {
      payload.hashedPhoneNumber = request.hashedPhoneNumber;
    }

    // Extract device IP for demo mode (bypasses OAuth)
    // When using device_ip query param, don't include device in body
    const deviceIp = request.device?.ipv4Address?.publicAddress || '';
    const params = new URLSearchParams({ core: this.coreName });
    if (deviceIp) {
      params.append('device_ip', deviceIp);
    }

    const response = await this.client.post(
      `/number-verification/vwip/verify?${params}`,
      payload,
      { headers: this.getHeaders() }
    );
    
    return response.data;
  }

  async getDevicePhoneNumber(device: Device): Promise<DevicePhoneNumberResponse> {
    // Normalize device for CAMARA compliance
    const normalizedDevice = normalizeDevice(device);
    
    // Extract device IP for demo mode
    const deviceIp = normalizedDevice?.ipv4Address?.publicAddress || '';
    const params = new URLSearchParams({ core: this.coreName });
    if (deviceIp) {
      params.append('device_ip', deviceIp);
    }

    const response = await this.client.get(
      `/number-verification/vwip/device-phone-number?${params}`,
      { headers: this.getHeaders() }
    );
    
    return response.data;
  }

  private parsePortSpec(portSpec: string): any {
    if (portSpec.includes('-')) {
      const [from, to] = portSpec.split('-').map(p => parseInt(p.trim()));
      return { ranges: [{ from, to }] };
    } else if (portSpec.includes(',')) {
      const ports = portSpec.split(',').map(p => parseInt(p.trim()));
      return { ports };
    } else {
      return { ports: [parseInt(portSpec)] };
    }
  }
}
