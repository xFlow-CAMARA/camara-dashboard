import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiName = searchParams.get('api');
  const limit = searchParams.get('limit') || '20';

  if (!apiName) {
    return NextResponse.json({ error: 'API name required' }, { status: 400 });
  }

  try {
    // Call TF-SDK API to get logs from MongoDB
    const response = await fetch(
      `http://tf-sdk-api:8200/logs?api=${encodeURIComponent(apiName)}&limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch logs', logs: [] },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Logs API error:', error);
    return NextResponse.json({ logs: [] }, { status: 200 });
  }
}
