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
  const params = new URLSearchParams();
  if (searchParams.get('invoker_id')) params.set('invoker_id', searchParams.get('invoker_id')!);
  if (searchParams.get('action'))     params.set('action',     searchParams.get('action')!);
  if (searchParams.get('limit'))      params.set('limit',      searchParams.get('limit')!);

  const qs = params.toString();
  const url = `${ONBOARDING_URL}/admin/audit${qs ? '?' + qs : ''}`;

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
