/**
 * Centralized API client for all backend communications
 * All fetch calls should go through this client to ensure consistent error handling
 * and configuration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

interface ApiResponse<T> {
  data: T;
  correlator?: string;
}

/**
 * Generate UUID - works in both secure and non-secure contexts
 * Falls back to a simple UUID generator when crypto.randomUUID is not available
 * (crypto.randomUUID requires HTTPS or localhost)
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for non-secure contexts (HTTP access)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class ApiClient {
  /**
   * Generate x-correlator UUID for request tracking
   */
  private generateCorrelator(): string {
    return generateUUID();
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { timeout = 10000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Ensure x-correlator header is always sent
    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('x-correlator')) {
      headers.set('x-correlator', this.generateCorrelator());
    }

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Log x-correlator for debugging
      const responseCorrelator = response.headers.get('x-correlator');
      if (responseCorrelator) {
        console.debug(`[API] x-correlator: ${responseCorrelator}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // CAMARA-compliant error format: { status, code, message }
        const errorMessage = errorData.message || errorData.error || errorData.detail || `HTTP ${response.status}`;
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.code = errorData.code;
        error.correlator = responseCorrelator;
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Health & Status endpoints
  async getHealth(adapter?: string): Promise<any> {
    const query = adapter ? `?adapter=${adapter}` : '';
    return this.request<any>(`/api/health${query}`);
  }

  async getCoreSimStatus(): Promise<any> {
    return this.request<any>('/api/coresim/status');
  }

  // Cores management
  async getCores(): Promise<any> {
    return this.request<any>('/api/cores', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }

  async getActiveCore(): Promise<any> {
    return this.request<any>('/api/cores/active');
  }

  async getCoreConfig(coreName: string): Promise<any> {
    return this.request<any>(`/api/cores/${coreName}/config`);
  }

  async updateCoreConfig(coreName: string, config: any): Promise<any> {
    return this.request<any>(`/api/cores/${coreName}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async controlCoreSimulator(action: 'start' | 'stop'): Promise<any> {
    return this.request<any>('/api/coresim/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  }

  async controlOaiCore(action: 'start' | 'stop' | 'restart'): Promise<any> {
    return this.request<any>('/api/cores/oai/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
      timeout: 150000, // 2.5 minutes for OAI startup
    });
  }

  async getOaiStatus(): Promise<any> {
    return this.request<any>('/api/cores/oai/status');
  }

  // QoD (Quality on Demand) endpoints
  async createQodSession(data: any): Promise<any> {
    return this.request<any>('/api/qod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getQodSession(sessionId: string): Promise<any> {
    return this.request<any>(`/api/qod?sessionId=${sessionId}`);
  }

  async deleteQodSession(sessionId: string): Promise<any> {
    return this.request<any>(`/api/qod?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Location endpoints
  async getLocation(data: any): Promise<any> {
    return this.request<any>('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async verifyLocation(data: any): Promise<any> {
    return this.request<any>('/api/location?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // Traffic Influence endpoints
  async createTrafficInfluence(data: any): Promise<any> {
    return this.request<any>('/api/traffic-influence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getTrafficInfluence(subscriptionId: string): Promise<any> {
    return this.request<any>(`/api/traffic-influence?subscriptionId=${subscriptionId}`);
  }

  async deleteTrafficInfluence(subscriptionId: string): Promise<any> {
    return this.request<any>(`/api/traffic-influence?subscriptionId=${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  // Number Verification endpoints
  async verifyPhoneNumber(data: any): Promise<any> {
    return this.request<any>('/api/number-verification/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getDevicePhoneNumber(deviceIp: string): Promise<any> {
    return this.request<any>(`/api/number-verification/device-phone-number?deviceIp=${encodeURIComponent(deviceIp)}`);
  }

  // Device Status endpoints (CAMARA Device Reachability & Roaming Status APIs)
  
  /**
   * Get device reachability status
   * Returns connectivity status: CONNECTED_SMS, CONNECTED_DATA, NOT_CONNECTED
   */
  async getReachabilityStatus(data: any): Promise<any> {
    return this.request<any>('/api/device-status/reachability/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Get device roaming status
   * Returns whether device is roaming and country information
   */
  async getRoamingStatus(data: any): Promise<any> {
    return this.request<any>('/api/device-status/roaming/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a reachability status subscription for event notifications
   */
  async createReachabilitySubscription(data: any): Promise<any> {
    return this.request<any>('/api/device-status/reachability/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a reachability status subscription
   */
  async deleteReachabilitySubscription(subscriptionId: string, adapter?: string): Promise<any> {
    const query = adapter ? `?adapter=${adapter}` : '';
    return this.request<any>(`/api/device-status/reachability/subscriptions/${subscriptionId}${query}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create a roaming status subscription for event notifications
   */
  async createRoamingSubscription(data: any): Promise<any> {
    return this.request<any>('/api/device-status/roaming/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a roaming status subscription
   */
  async deleteRoamingSubscription(subscriptionId: string, adapter?: string): Promise<any> {
    const query = adapter ? `?adapter=${adapter}` : '';
    return this.request<any>(`/api/device-status/roaming/subscriptions/${subscriptionId}${query}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export type for the client
export type { ApiClient };
