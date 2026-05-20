import { NextResponse } from 'next/server';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  if (searchParams.get('invoker_id')) params.set('invoker_id', searchParams.get('invoker_id')!);
  if (searchParams.get('action'))     params.set('action',     searchParams.get('action')!);
  if (searchParams.get('limit'))      params.set('limit',      searchParams.get('limit')!);

  const qs = params.toString();
  const url = `${ONBOARDING_URL}/admin/audit${qs ? '?' + qs : ''}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
