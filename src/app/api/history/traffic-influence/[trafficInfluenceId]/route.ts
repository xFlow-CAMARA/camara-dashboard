import { NextRequest, NextResponse } from 'next/server';

const TF_SDK_URL = process.env.TF_SDK_URL || 'http://tf-sdk-api:8200';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { trafficInfluenceId: string } }
) {
  try {
    const { trafficInfluenceId } = params;
    const url = `${TF_SDK_URL}/history/traffic-influence/${trafficInfluenceId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('History Traffic Influence delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete Traffic Influence' },
      { status: 500 }
    );
  }
}
