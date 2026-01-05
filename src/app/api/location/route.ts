import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import {
  createErrorInfo,
  mapStatusToErrorCode,
  normalizeDevice,
  ErrorInfo,
} from '@/lib/types/camara';

/**
 * Helper to get x-correlator from request or generate new one
 */
function getCorrelator(request: NextRequest): string {
  return request.headers.get('x-correlator') || crypto.randomUUID();
}

/**
 * Create CAMARA-compliant error response
 */
function errorResponse(
  status: number,
  code: ErrorInfo['code'],
  message: string,
  correlator: string
): NextResponse {
  return NextResponse.json(createErrorInfo(status, code, message), {
    status,
    headers: { 'x-correlator': correlator },
  });
}

/**
 * POST /location-retrieval/v0/retrieve
 * Retrieve device location - Returns 200 OK per CAMARA spec
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'coresim');

    // Normalize device structure for CAMARA compliance
    const normalizedDevice = normalizeDevice(body.device);

    // Validate device is provided (required for location retrieval)
    if (!normalizedDevice) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'device identifier is required (ipv4Address, phoneNumber, or networkAccessIdentifier)',
        correlator
      );
    }

    // Validate at least one device identifier
    const hasIdentifier =
      normalizedDevice.ipv4Address ||
      normalizedDevice.phoneNumber ||
      normalizedDevice.networkAccessIdentifier ||
      normalizedDevice.ipv6Address;

    if (!hasIdentifier) {
      return errorResponse(
        400,
        'DEVICE_UNIDENTIFIABLE',
        'At least one device identifier must be provided',
        correlator
      );
    }

    const result = await adapter.getLocation({
      device: normalizedDevice,
      maxAge: body.maxAge || 60,
      maxSurface: body.maxSurface,
    });

    // CAMARA: POST for location retrieval returns 200 OK
    return NextResponse.json(result, {
      status: 200,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Location retrieval error:', error);
    const status = error.response?.status || 500;

    // Map specific errors to CAMARA error codes
    let code = mapStatusToErrorCode(status);
    if (error.message?.includes('not found') || error.message?.includes('nil')) {
      code = 'DEVICE_NOT_FOUND';
    }

    return errorResponse(
      status,
      code,
      error.message || 'Failed to retrieve device location',
      correlator
    );
  }
}
