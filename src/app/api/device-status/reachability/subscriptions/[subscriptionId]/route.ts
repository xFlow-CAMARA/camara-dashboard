import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import {
  ErrorInfo,
  createErrorInfo,
  mapStatusToErrorCode,
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

interface RouteParams {
  params: {
    subscriptionId: string;
  };
}

/**
 * GET /device-status/reachability/subscriptions/[subscriptionId]
 * Retrieve a specific reachability subscription
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const correlator = getCorrelator(request);
  const { subscriptionId } = params;

  try {
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'coresim';
    const adapter = getAdapter(adapterName as any);

    // This would retrieve the subscription details
    // For now, return the subscription ID as confirmation
    return NextResponse.json(
      {
        subscriptionId,
        message: 'Subscription retrieval endpoint - implement with backend storage',
      },
      {
        status: 200,
        headers: { 'x-correlator': correlator },
      }
    );
  } catch (error: any) {
    console.error('Get reachability subscription error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to retrieve subscription',
      correlator
    );
  }
}

/**
 * DELETE /device-status/reachability/subscriptions/[subscriptionId]
 * Delete a reachability subscription - Returns 204 No Content
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const correlator = getCorrelator(request);
  const { subscriptionId } = params;

  try {
    const adapterName = request.nextUrl.searchParams.get('adapter') || 'coresim';
    const adapter = getAdapter(adapterName as any);

    await adapter.deleteReachabilitySubscription(subscriptionId);

    return new NextResponse(null, {
      status: 204,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('Delete reachability subscription error:', error);
    const status = error.response?.status || 500;
    return errorResponse(
      status,
      mapStatusToErrorCode(status),
      error.message || 'Failed to delete subscription',
      correlator
    );
  }
}
