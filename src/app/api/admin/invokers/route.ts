import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const ADMIN_API_KEY  = process.env.INVOKER_ADMIN_API_KEY  || '';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  if (searchParams.get('status')) qs.set('status', searchParams.get('status')!);
  if (searchParams.get('limit'))  qs.set('limit',  searchParams.get('limit')!);
  if (searchParams.get('skip'))   qs.set('skip',   searchParams.get('skip')!);
  const url = `${ONBOARDING_URL}/admin/invokers${qs.toString() ? '?' + qs.toString() : ''}`;

  const headers: Record<string, string> = {};
  if (ADMIN_API_KEY) headers['X-Admin-Api-Key'] = ADMIN_API_KEY;

  try {
    const r = await fetch(url, { cache: 'no-store', headers });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
