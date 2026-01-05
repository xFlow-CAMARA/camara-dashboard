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
 * POST /quality-on-demand/v1/sessions
 * Create a new QoD session - Returns 201 Created per CAMARA spec
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();
    const adapter = getAdapter(body.adapter || 'tfsdk');

    // Validate required fields
    if (!body.applicationServer?.ipv4Address) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'applicationServer.ipv4Address is required',
        correlator
      );
    }

    // Normalize device structure for CAMARA compliance
    const normalizedDevice = normalizeDevice(body.device);

    const result = await adapter.createQodSession({
      device: normalizedDevice,
      applicationServer: body.applicationServer,
      qosProfile: body.qosProfile || 'qos-e',
      duration: body.duration || 3600,
      devicePorts: body.devicePorts,
      applicationServerPorts: body.applicationServerPorts,
      sink: body.sink || body.notificationUrl, // CAMARA uses 'sink'
      sinkCredential: body.sinkCredential,
    });

    // CAMARA: POST returns 201 Created for new resources
    return NextResponse.json(result, {
      status: 201,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('QoD session creation error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to create QoD session',
      correlator
    );
  }
}

/**
 * GET /quality-on-demand/v1/sessions/{sessionId}
 * Retrieve QoD session - Returns 200 OK per CAMARA spec
 */
export async function GET(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'tfsdk';

    const adapter = getAdapter(adapterName);

    // If sessionId is provided, get specific session
    if (sessionId) {
      const result = await adapter.getQodSession(sessionId);
      return NextResponse.json(result, {
        status: 200,
        headers: { 'x-correlator': correlator },
      });
    }

    // List all sessions (empty for now)
    return NextResponse.json(
      { sessions: [] },
      {
        status: 200,
        headers: { 'x-correlator': correlator },
      }
    );
  } catch (error: any) {
    console.error('QoD session retrieval error:', error);
    const status = error.response?.status || 500;
    const code = status === 404 ? 'NOT_FOUND' : mapStatusToErrorCode(status);
    return errorResponse(
      status,
      code,
      error.message || 'Failed to get QoD session(s)',
      correlator
    );
  }
}

/**
 * DELETE /quality-on-demand/v1/sessions/{sessionId}
 * Delete QoD session - Returns 204 No Content per CAMARA spec
 */
export async function DELETE(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'tfsdk';

    if (!sessionId) {
      return errorResponse(
        400,
        'INVALID_ARGUMENT',
        'sessionId query parameter is required',
        correlator
      );
    }

    const adapter = getAdapter(adapterName);
    await adapter.deleteQodSession(sessionId);

    // CAMARA: DELETE returns 204 No Content (empty body)
    return new NextResponse(null, {
      status: 204,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('QoD session deletion error:', error);
    const status = error.response?.status || 500;
    const code = status === 404 ? 'NOT_FOUND' : mapStatusToErrorCode(status);
    return errorResponse(
      status,
      code,
      error.message || 'Failed to delete QoD session',
      correlator
    );
  }
}
