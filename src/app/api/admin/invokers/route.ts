import { NextResponse } from 'next/server';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const url = status
    ? `${ONBOARDING_URL}/admin/invokers?status=${encodeURIComponent(status)}`
    : `${ONBOARDING_URL}/admin/invokers`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
