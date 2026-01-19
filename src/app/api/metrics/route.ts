import { NextResponse } from 'next/server';

const MONGODB_API = process.env.MONGODB_API || 'http://mongodb:27017';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiName = searchParams.get('api');

  if (!apiName) {
    return NextResponse.json({ error: 'API name required' }, { status: 400 });
  }

  try {
    // Connect to TF-SDK API to get metrics from MongoDB
    const response = await fetch(`http://tf-sdk-api:8200/metrics?api=${encodeURIComponent(apiName)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch metrics', total_requests: 0, success_count: 0, error_count: 0, avg_latency_ms: 0, error_rate: 0 },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { total_requests: 0, success_count: 0, error_count: 0, avg_latency_ms: 0, error_rate: 0 },
      { status: 200 }
    );
  }
}
