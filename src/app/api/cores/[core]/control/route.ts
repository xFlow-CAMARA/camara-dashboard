import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ core: string }> }
) {
  try {
    const { action } = await request.json();
    const { core } = await context.params;

    if (!['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: start or stop' },
        { status: 400 }
      );
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://tf-sdk-api:8200'}/api/cores/${core}/control`,
      { action },
      { timeout: 10000 }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to control core:', error);
    return NextResponse.json(
      {
        error: error.response?.data?.detail || error.message || 'Failed to control core',
      },
      { status: error.response?.status || 500 }
    );
  }
}
// trigger reload
