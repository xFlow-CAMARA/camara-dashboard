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
 * POST /number-verification/vwip/verify
 * Verify if a phone number matches the device - Returns 200 OK per CAMARA spec
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'coresim');

    // Validate at least one phone number is provided
    if (!body.phoneNumber && !body.hashedPhoneNumber) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'Either phoneNumber or hashedPhoneNumber is required',
        correlator
      );
    }

    // Normalize device structure for CAMARA compliance
    const normalizedDevice = normalizeDevice(body.device);

    const result = await adapter.verifyPhoneNumber({
      device: normalizedDevice,
      phoneNumber: body.phoneNumber,
      hashedPhoneNumber: body.hashedPhoneNumber,
    });

    // CAMARA: POST for verification returns 200 OK
    return NextResponse.json(result, {
      status: 200,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Number verification error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to verify phone number',
      correlator
    );
  }
}
