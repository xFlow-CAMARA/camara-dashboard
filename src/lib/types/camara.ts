// CAMARA API Types - Fully Compliant with CAMARA Specifications
// QoD v1.1.0, Location Retrieval v0.5.0, Traffic Influence vWIP

// ============================================
// CAMARA Common Types (CAMARA_common.yaml)
// ============================================

/**
 * CAMARA-compliant error response format
 * All API errors must return this structure
 */
export type ErrorCode =
  | 'INVALID_ARGUMENT'
  | 'INVALID_TOKEN'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL'
  | 'SERVICE_UNAVAILABLE'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_UNIDENTIFIABLE'
  | 'DEVICE_NOT_APPLICABLE'
  | 'INVALID_DEVICE_IDENTIFIER'
  | 'MISSING_IDENTIFIER'
  | 'OUT_OF_RANGE';

export interface ErrorInfo {
  status: number;
  code: ErrorCode;
  message: string;
}

/**
 * Time window for scheduled operations
 */
export interface TimeWindow {
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
}

/**
 * Network identifier (MCC/MNC)
 */
export interface NetworkIdentifier {
  mcc: string; // Mobile Country Code (3 digits)
  mnc: string; // Mobile Network Code (2-3 digits)
}

// ============================================
// Device Types
// ============================================

export interface DeviceIpv4Addr {
  publicAddress: string;
  privateAddress?: string;
  publicPort?: number;
}

export interface Device {
  networkAccessIdentifier?: string;
  ipv4Address?: DeviceIpv4Addr;
  ipv6Address?: string;
  phoneNumber?: string;
}

export interface PortRange {
  from: number;
  to: number;
}

export interface PortsSpec {
  ranges?: PortRange[];
  ports?: number[];
}

export interface SinkCredential {
  credentialType: 'ACCESSTOKEN';
  accessToken: string;
  accessTokenExpiresUtc: string;
  accessTokenType: 'bearer';
}

// QoS/QoD Types - CAMARA Compliant
export interface QodSession {
  device?: Device; // Optional in 3-legged token flow
  applicationServer: {
    ipv4Address: string;
    ipv6Address?: string;
  };
  devicePorts?: PortsSpec;
  applicationServerPorts?: PortsSpec;
  qosProfile: string;
  duration: number;
  sink?: string; // CAMARA uses 'sink' not 'notificationUrl'
  sinkCredential?: SinkCredential;
}

export type QosStatus = 'REQUESTED' | 'AVAILABLE' | 'UNAVAILABLE';
export type StatusInfo = 'DURATION_EXPIRED' | 'NETWORK_TERMINATED' | 'DELETE_REQUESTED';

export interface QodSessionResponse {
  sessionId: string;
  duration: number;
  qosProfile: string;
  device?: Device; // Only returned when provided in request
  applicationServer: {
    ipv4Address: string;
    ipv6Address?: string;
  };
  devicePorts?: PortsSpec;
  applicationServerPorts?: PortsSpec;
  qosStatus: QosStatus;
  statusInfo?: StatusInfo;
  startedAt?: string; // Not present when qosStatus is REQUESTED
  expiresAt?: string; // Not present when qosStatus is REQUESTED
  sink?: string;
  sinkCredential?: SinkCredential;
}

export interface ExtendSessionDuration {
  requestedAdditionalDuration: number;
}

export interface CloudEvent {
  id: string;
  source: string;
  specversion: '1.0';
  type: 'org.camaraproject.quality-on-demand.v1.qos-status-changed';
  time: string;
  datacontenttype?: 'application/json';
  data: {
    sessionId: string;
    qosStatus: QosStatus;
    statusInfo?: StatusInfo;
  };
}

// Location Types
export interface Point {
  latitude: number;
  longitude: number;
}

export interface Polygon {
  areaType: 'POLYGON';
  boundary: Point[];
}

export interface Circle {
  areaType: 'CIRCLE';
  center: Point;
  radius: number;
}

// Union type for Area (Circle or Polygon)
export type Area = Circle | Polygon;

export interface LocationRequest {
  device?: Device;
  maxAge?: number;
  maxSurface?: number;
}

export interface LocationResponse {
  lastLocationTime: string;
  area: Area;
  device?: {
    phoneNumber?: string;
    networkAccessIdentifier?: string;
    ipv4Address?: DeviceIpv4Addr;
    ipv6Address?: string;
  };
}

// Traffic Influence Types
export interface TrafficInfluenceRequest {
  device: Device;
  applicationServer: {
    ipv4Address: string;
  };
  trafficFilters: Array<{
    protocol: string;
    srcPort?: number;
    dstPort?: number;
  }>;
  edgeCloudZoneId?: string;
  edgeCloudRegion?: string;
}

export interface TrafficInfluenceResponse {
  subscriptionId: string;
  device: Device;
  applicationServer: {
    ipv4Address: string;
  };
  trafficFilters: Array<{
    protocol: string;
    srcPort?: number;
    dstPort?: number;
  }>;
  state: string;
  createdAt: string;
}

// Number Verification Types - CAMARA Number Verification vWIP
export interface NumberVerificationRequest {
  device?: Device;
  phoneNumber?: string;
  hashedPhoneNumber?: string;
}

export interface NumberVerificationResponse {
  devicePhoneNumberVerified: boolean;
}

export interface DevicePhoneNumberResponse {
  devicePhoneNumber: string;
}

// Device Status Types - CAMARA Device Status v1.0.0
export type ConnectivityStatus = 'CONNECTED_SMS' | 'CONNECTED_DATA' | 'NOT_CONNECTED';

export interface ReachabilityStatusRequest {
  device: Device;
}

export interface ReachabilityStatusResponse {
  reachabilityStatus: ConnectivityStatus;
  lastStatusTime?: string;
}

export interface RoamingStatusRequest {
  device: Device;
}

export interface RoamingStatusResponse {
  roaming: boolean;
  countryCode?: string;
  countryName?: string[];
}

export interface DeviceStatusSubscriptionRequest {
  device: Device;
  sink: string;
  sinkCredential?: {
    credentialType: 'ACCESSTOKEN';
    accessToken: string;
    accessTokenExpiresUtc: string;
    accessTokenType: 'bearer';
  };
  subscriptionExpireTime?: string;
  subscriptionMaxEvents?: number;
}

export interface DeviceStatusSubscriptionResponse {
  subscriptionId: string;
  device: Device;
  sink: string;
  startsAt: string;
  expiresAt?: string;
}

// Backend Adapter Interface
export interface BackendAdapter {
  name: string;
  createQodSession(request: QodSession): Promise<QodSessionResponse>;
  getQodSession(sessionId: string): Promise<QodSessionResponse>;
  deleteQodSession(sessionId: string): Promise<void>;
  
  getLocation(request: LocationRequest): Promise<LocationResponse>;
  
  createTrafficInfluence(request: TrafficInfluenceRequest): Promise<TrafficInfluenceResponse>;
  getTrafficInfluence(subscriptionId: string): Promise<TrafficInfluenceResponse>;
  deleteTrafficInfluence(subscriptionId: string): Promise<void>;
  
  // Number Verification APIs
  verifyPhoneNumber(request: NumberVerificationRequest): Promise<NumberVerificationResponse>;
  getDevicePhoneNumber(device: Device): Promise<DevicePhoneNumberResponse>;
  
  // Device Status APIs
  getReachabilityStatus(request: ReachabilityStatusRequest): Promise<ReachabilityStatusResponse>;
  getRoamingStatus(request: RoamingStatusRequest): Promise<RoamingStatusResponse>;
  createReachabilitySubscription(request: DeviceStatusSubscriptionRequest): Promise<DeviceStatusSubscriptionResponse>;
  deleteReachabilitySubscription(subscriptionId: string): Promise<void>;
  createRoamingSubscription(request: DeviceStatusSubscriptionRequest): Promise<DeviceStatusSubscriptionResponse>;
  deleteRoamingSubscription(subscriptionId: string): Promise<void>;
}

// Provisioning Status
export interface ProvisioningStatus {
  id: string;
  type: 'qod' | 'location' | 'traffic-influence';
  status: 'active' | 'expired' | 'failed';
  createdAt: string;
  expiresAt?: string;
  details: any;
}

// ============================================
// CAMARA Helper Functions
// ============================================

/**
 * Create a CAMARA-compliant error response
 */
export function createErrorInfo(
  status: number,
  code: ErrorCode,
  message: string
): ErrorInfo {
  return { status, code, message };
}

/**
 * Map HTTP status codes to CAMARA error codes
 */
export function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400: return 'INVALID_ARGUMENT';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'PERMISSION_DENIED';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'TOO_MANY_REQUESTS';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return 'INTERNAL';
  }
}

/**
 * Normalize device structure to ensure CAMARA compliance
 * Wraps plain IP strings in proper DeviceIpv4Addr structure
 */
export function normalizeDevice(device: any): Device | undefined {
  if (!device) return undefined;

  const normalized: Device = {};

  // Handle networkAccessIdentifier
  if (device.networkAccessIdentifier) {
    normalized.networkAccessIdentifier = device.networkAccessIdentifier;
  }

  // Handle phoneNumber
  if (device.phoneNumber) {
    normalized.phoneNumber = device.phoneNumber;
  }

  // Handle ipv6Address
  if (device.ipv6Address) {
    normalized.ipv6Address = device.ipv6Address;
  }

  // Handle ipv4Address - ensure it's wrapped in DeviceIpv4Addr structure
  if (device.ipv4Address) {
    if (typeof device.ipv4Address === 'string') {
      // Plain string - wrap it
      normalized.ipv4Address = { publicAddress: device.ipv4Address };
    } else if (typeof device.ipv4Address === 'object') {
      // Already an object - ensure publicAddress exists
      normalized.ipv4Address = {
        publicAddress: device.ipv4Address.publicAddress || device.ipv4Address.public_address || '',
        ...(device.ipv4Address.privateAddress && { privateAddress: device.ipv4Address.privateAddress }),
        ...(device.ipv4Address.publicPort && { publicPort: device.ipv4Address.publicPort }),
      };
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
