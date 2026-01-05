import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import {
  ErrorInfo,
  createErrorInfo,
  mapStatusToErrorCode,
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
 * GET /number-verification/vwip/device-phone-number
 * Retrieve the phone number associated with a device - Returns 200 OK per CAMARA spec
 */
export async function GET(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const deviceIp = request.nextUrl.searchParams.get('deviceIp') || '';
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'coresim';

    if (!deviceIp) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'deviceIp query parameter is required',
        correlator
      );
    }

    const adapter = getAdapter(adapterName);

    const result = await adapter.getDevicePhoneNumber({
      ipv4Address: { publicAddress: deviceIp },
    });

    // CAMARA: GET for device-phone-number returns 200 OK
    return NextResponse.json(result, {
      status: 200,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Device phone number error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to get device phone number',
      correlator
    );
  }
}
