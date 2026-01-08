import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Server-side environment variable (not NEXT_PUBLIC_ which is build-time only)
const TF_SDK_BASE_URL = process.env.TF_SDK_URL || process.env.TF_SDK_API_URL || 'http://tf-sdk-api:8200';

export async function GET(request: NextRequest) {
  try {
    // Get cores list from tf-sdk API
    const response = await axios.get(`${TF_SDK_BASE_URL}/api/cores`, {
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
