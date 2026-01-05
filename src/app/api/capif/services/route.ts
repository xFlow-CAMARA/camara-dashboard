import { NextResponse } from 'next/server';

// Runtime function to get TF-SDK URL - avoids build-time inlining
function getTfSdkUrl(): string {
  return process.env.TF_SDK_URL || process.env.TF_SDK_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://tf-sdk-api:8200';
}

export async function GET() {
  const TF_SDK_API_URL = getTfSdkUrl();
  
  try {
    const response = await fetch(`${TF_SDK_API_URL}/services`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch services: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching CAPIF services:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
