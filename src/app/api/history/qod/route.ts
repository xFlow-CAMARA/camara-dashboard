import { NextRequest, NextResponse } from 'next/server';

const TF_SDK_URL = process.env.TF_SDK_URL || 'http://tf-sdk-api:8200';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = `${TF_SDK_URL}/history/qod?${searchParams.toString()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('History QoD fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch QoD history' },
      { status: 500 }
    );
  }
}
