import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const adapter = getAdapter('coresim');
    
    let result;
    if (action === 'start') {
      result = await (adapter as any).startSimulation();
    } else if (action === 'stop') {
      result = await (adapter as any).stopSimulation();
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      ...result,
    });
  } catch (error: any) {
    console.error('CoreSim control error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'CoreSim control failed',
      },
      { status: 500 }
    );
  }
}
