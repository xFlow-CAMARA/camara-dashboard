import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import {
  ErrorInfo,
  createErrorInfo,
  mapStatusToErrorCode,
  normalizeDevice,
} from '@/lib/types/camara';

/**
 * Helper to generate UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCorrelator(request: NextRequest): string {
  return request.headers.get('x-correlator') || generateUUID();
}

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
 * POST /device-status/roaming/subscriptions
 * Create a roaming status subscription - Returns 201 Created
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'coresim');

    if (!body.device) {
      return errorResponse(400, 'INVALID_ARGUMENT', 'device is required', correlator);
    }
    if (!body.sink) {
      return errorResponse(400, 'INVALID_ARGUMENT', 'sink (webhook URL) is required', correlator);
    }

    const normalizedDevice = normalizeDevice(body.device);

    const result = await adapter.createRoamingSubscription({
      device: normalizedDevice!,
      sink: body.sink,
      sinkCredential: body.sinkCredential,
      subscriptionExpireTime: body.subscriptionExpireTime,
      subscriptionMaxEvents: body.subscriptionMaxEvents,
    });

    return NextResponse.json(result, {
      status: 201,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Create roaming subscription error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to create subscription',
      correlator
    );
  }
}
