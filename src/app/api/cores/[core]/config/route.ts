import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function PUT(
  request: NextRequest,
  { params }: { params: { core: string } }
) {
  try {
    const body = await request.json();
    const coreName = params.core;

    // Forward the request to tf-sdk API
    const apiUrl = process.env.TF_SDK_URL || 'http://tf-sdk-api:8200';
    const response = await axios.put(
      `${apiUrl}/api/cores/${coreName}/config`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000, // 45 seconds for container restart
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to update core config:', error);
    
    if (error.response) {
      return NextResponse.json(
        { detail: error.response.data?.detail || 'Failed to update configuration' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { detail: error.message || 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
