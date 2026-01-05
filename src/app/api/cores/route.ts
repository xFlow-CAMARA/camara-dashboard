import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    // Get cores list from tf-sdk API
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://tf-sdk-api:8200'}/api/cores`, {
      timeout: 5000,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch cores:', error);
    return NextResponse.json(
      {
        cores: [],
        error: error.message || 'Failed to fetch available cores',
      },
      { status: 503 }
    );
  }
}
