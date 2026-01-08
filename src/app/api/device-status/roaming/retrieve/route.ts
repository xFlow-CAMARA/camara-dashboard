import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import {
  ErrorInfo,
  createErrorInfo,
  mapStatusToErrorCode,
  normalizeDevice,
} from '@/lib/types/camara';

/**
 * Helper to get x-correlator from request or generate new one
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCorrelator(request: NextRequest): string {
  return request.headers.get('x-correlator') || generateUUID();
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
 * POST /device-status/roaming/retrieve
 * Check if a device is roaming - Returns 200 OK per CAMARA spec
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'coresim');

    // Validate device is provided
    if (!body.device) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'device is required',
        correlator
      );
    }

    // Normalize device structure for CAMARA compliance
    const normalizedDevice = normalizeDevice(body.device);

    const result = await adapter.getRoamingStatus({
      device: normalizedDevice!,
    });

    // CAMARA: POST for retrieve returns 200 OK
    return NextResponse.json(result, {
      status: 200,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Roaming status error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to get roaming status',
      correlator
    );
  }
}
