import { NextRequest, NextResponse } from 'next/server';

const TF_SDK_URL = process.env.TF_SDK_URL || 'http://tf-sdk-api:8200';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = `${TF_SDK_URL}/history/traffic-influence?${searchParams.toString()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('History Traffic Influence fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Traffic Influence history' },
      { status: 500 }
    );
  }
}
