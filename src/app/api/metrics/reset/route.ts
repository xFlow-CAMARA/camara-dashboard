import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiName = searchParams.get('api');

  if (!apiName) {
    return NextResponse.json({ error: 'API name required' }, { status: 400 });
  }

  try {
    // Call TF-SDK API to reset metrics in MongoDB
    const response = await fetch(`http://tf-sdk-api:8200/metrics/reset?api=${encodeURIComponent(apiName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to reset metrics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reset metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
