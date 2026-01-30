import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/utils/hash
 * Calculate SHA-256 hash of a phone number (server-side fallback)
 * Used when client-side crypto.subtle is not available
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    // Calculate SHA-256 hash using Node.js crypto
    const hash = crypto
      .createHash('sha256')
      .update(phoneNumber)
      .digest('hex');

    return NextResponse.json({ hash, phoneNumber });
  } catch (error: any) {
    console.error('Hash calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate hash' },
      { status: 500 }
    );
  }
}
