import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const servicesParam = searchParams.get('services') || '';
  const lines = searchParams.get('lines') || '50';
  const api = searchParams.get('api') || '';

  if (!servicesParam) {
    return NextResponse.json({ error: 'Services parameter required' }, { status: 400 });
  }

  try {
    // Call TF-SDK API to get core logs with API filtering
    const url = `http://tf-sdk-api:8200/core-logs?services=${encodeURIComponent(servicesParam)}&lines=${lines}${api ? `&api=${encodeURIComponent(api)}` : ''}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch core logs', logs: [] },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Core logs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch core logs', logs: [] },
      { status: 500 }
    );
  }
}
