import { NextRequest, NextResponse } from 'next/server';

function getTfSdkUrl() {
  return process.env.TF_SDK_URL || process.env.NEXT_PUBLIC_API_URL || 'http://tf-sdk-api:8200';
}

export async function POST(request: NextRequest) {
  const TF_SDK_URL = getTfSdkUrl();
  try {
    const phoneNumber = request.nextUrl.searchParams.get('phoneNumber');
    const token = request.nextUrl.searchParams.get('token');
    const deviceIp = request.nextUrl.searchParams.get('deviceIp');

    if (!phoneNumber) {
      return NextResponse.json(
        { status: 400, code: 'INVALID_ARGUMENT', message: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ phone_number: phoneNumber });
    if (token) params.append('token', token);
    if (deviceIp) params.append('device_ip', deviceIp);

    const response = await fetch(
      `${TF_SDK_URL}/number-verification/vwip/demo/register-session?${params}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Demo register session error:', error);
    return NextResponse.json(
      { status: 500, code: 'INTERNAL', message: error.message },
      { status: 500 }
    );
  }
}
