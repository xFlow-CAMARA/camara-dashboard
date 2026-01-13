import { NextRequest, NextResponse } from 'next/server';

const TF_SDK_BASE_URL = process.env.TF_SDK_BASE_URL || 'http://tf-sdk-api:8200';

/**
 * Helper to get x-correlator from request or generate new one
 */
function getCorrelator(request: NextRequest): string {
  return request.headers.get('x-correlator') || crypto.randomUUID();
}

/**
 * POST /api/sim-swap/check
 * Check if SIM swap occurred within a specified period
 * 
 * Request body:
 * - phoneNumber: string (E.164 format, e.g., +346661113334)
 * - maxAge?: number (hours to check, 1-2400, default 240)
 * 
 * Response:
 * - swapped: boolean (true if SIM was swapped within maxAge)
 */
export async function POST(request: NextRequest) {
  const correlator = getCorrelator(request);

  try {
    const body = await request.json();

    // Validate phone number
    if (!body.phoneNumber) {
      return NextResponse.json(
        { status: 422, code: 'MISSING_IDENTIFIER', message: 'phoneNumber is required' },
        { status: 422, headers: { 'x-correlator': correlator } }
      );
    }

    // Forward to TF-SDK SIM Swap API
    const response = await fetch(`${TF_SDK_BASE_URL}/sim-swap/vwip/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlator': correlator,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: { 'x-correlator': correlator },
    });
  } catch (error: any) {
    console.error('SIM Swap check error:', error);
    return NextResponse.json(
      { status: 500, code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Internal server error' },
      { status: 500, headers: { 'x-correlator': correlator } }
    );
  }
}
