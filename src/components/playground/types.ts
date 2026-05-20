export interface InvokerSummary {
  invoker_id: string;
  invoker_name: string;
  approval_status: string;
  scopes_approved?: string[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiEndpoint {
  label:  string;
  method: HttpMethod;
  path:   string;
  body?:  object;
}

export interface TryResponse {
  status?: number;
  body?:   unknown;
  error?:  string;
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    'bg-emerald-100 text-emerald-800 border-emerald-300',
  POST:   'bg-sky-100 text-sky-800 border-sky-300',
  PUT:    'bg-amber-100 text-amber-800 border-amber-300',
  DELETE: 'bg-rose-100 text-rose-800 border-rose-300',
};

export const CATALOG: Record<string, ApiEndpoint[]> = {
  'quality-on-demand': [
    { label: 'Create QoD session', method: 'POST', path: '/quality-on-demand/v1/sessions',
      body: {
        duration: 3600,
        device: {
          phoneNumber: '+33699901032',
          ipv4Address: { publicAddress: '203.0.113.5', privateAddress: '10.0.0.5' },
        },
        applicationServer: { ipv4Address: '198.51.100.1' },
        qosProfile: 'qos-e',
      } },
    { label: 'Get session by ID',    method: 'GET',    path: '/quality-on-demand/v1/sessions/{sessionId}' },
    { label: 'Delete session',       method: 'DELETE', path: '/quality-on-demand/v1/sessions/{sessionId}' },
  ],
  'location-retrieval': [
    { label: 'Retrieve location', method: 'POST', path: '/location-retrieval/v0/retrieve',
      body: { device: { phoneNumber: '+33699901032' }, maxAge: 60 } },
  ],
  'traffic-influence': [
    { label: 'List subscriptions',   method: 'GET',  path: '/traffic-influence/vwip/traffic-influences' },
    { label: 'Create subscription',  method: 'POST', path: '/traffic-influence/vwip/traffic-influences',
      body: {
        trafficInfluenceID: 'demo-1',
        apiConsumerId:      'demo',
        appId:              'demo-app',
        edgeCloudZoneId:    'zone-1',
      } },
  ],
  'number-verification': [
    { label: 'Verify phone number', method: 'POST', path: '/number-verification/vwip/verify',
      body: { phoneNumber: '+33699901032' } },
  ],
  'device-status': [
    { label: 'Check roaming status', method: 'POST', path: '/device-status/v0/roaming',
      body: { device: { phoneNumber: '+33699901032' } } },
  ],
  'device-reachability-status': [
    { label: 'Retrieve reachability', method: 'POST', path: '/device-reachability-status/v1/retrieve',
      body: { device: { phoneNumber: '+33699901032' } } },
  ],
  'sim-swap': [
    { label: 'Public demo (no auth)',  method: 'GET',  path: '/sim-swap/vwip/demo/database' },
    { label: 'Check SIM swap',         method: 'POST', path: '/sim-swap/vwip/check',
      body: { phoneNumber: '+33699901032' } },
    { label: 'Retrieve last swap date', method: 'POST', path: '/sim-swap/vwip/retrieve-date',
      body: { phoneNumber: '+33699901032' } },
  ],
};
