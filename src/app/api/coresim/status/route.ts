import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(request: NextRequest) {
  try {
    // Use CoreSim adapter (via tf-sdk integration)
    const adapter = getAdapter('coresim');
    const status = await (adapter as any).getCoreStatus();
    
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('CoreSim status error:', error);
    return NextResponse.json(
      {
        available: false,
        status: 'ERROR',
        error: error.message || 'Failed to fetch CoreSim status',
      },
      { status: 500 }
    );
  }
}
