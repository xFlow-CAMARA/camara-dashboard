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
 * POST /traffic-influence/v1/subscriptions
 * Create traffic influence subscription - Returns 201 Created per CAMARA spec
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'coresim');

    // Normalize device structure for CAMARA compliance
    const normalizedDevice = normalizeDevice(body.device);

    // Validate device is provided
    if (!normalizedDevice) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'device identifier is required',
        correlator
      );
    }

    const result = await adapter.createTrafficInfluence({
      device: normalizedDevice,
      applicationServer: body.applicationServer,
      trafficFilters: body.trafficFilters || [],
      edgeCloudZoneId: body.edgeCloudZoneId,
      edgeCloudRegion: body.edgeCloudRegion,
    });

    // CAMARA: POST returns 201 Created for new resources
    return NextResponse.json(result, {
      status: 201,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Traffic Influence creation error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to create traffic influence subscription',
      correlator
    );
  }
}

/**
 * GET /traffic-influence/v1/subscriptions/{subscriptionId}
 * Retrieve traffic influence subscription - Returns 200 OK per CAMARA spec
 */
export async function GET(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'coresim';

    const adapter = getAdapter(adapterName);

    // If subscriptionId is provided, get specific subscription
    if (subscriptionId) {
      const result = await adapter.getTrafficInfluence(subscriptionId);
      return NextResponse.json(result, {
        status: 200,
        headers: { 'x-correlator': correlator },
      });
    }

    // List all subscriptions (empty for now)
    return NextResponse.json(
      { subscriptions: [] },
      {
        status: 200,
        headers: { 'x-correlator': correlator },
      }
    );
  } catch (error: any) {
    console.error('Traffic Influence retrieval error:', error);
    const status = error.response?.status || 500;
    const code = status === 404 ? 'NOT_FOUND' : mapStatusToErrorCode(status);
    return errorResponse(
      status,
      code,
      error.message || 'Failed to get traffic influence subscription(s)',
      correlator
    );
  }
}

/**
 * DELETE /traffic-influence/v1/subscriptions/{subscriptionId}
 * Delete traffic influence subscription - Returns 204 No Content per CAMARA spec
 */
export async function DELETE(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'coresim';

    if (!subscriptionId) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'subscriptionId query parameter is required',
        correlator
      );
    }

    const adapter = getAdapter(adapterName);
    await adapter.deleteTrafficInfluence(subscriptionId);

    // CAMARA: DELETE returns 204 No Content (empty body)
    return new NextResponse(null, {
      status: 204,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Traffic Influence deletion error:', error);
    const status = error.response?.status || 500;
    const code = status === 404 ? 'NOT_FOUND' : mapStatusToErrorCode(status);
    return errorResponse(
      status,
      code,
      error.message || 'Failed to delete traffic influence subscription',
      correlator
    );
  }
}
