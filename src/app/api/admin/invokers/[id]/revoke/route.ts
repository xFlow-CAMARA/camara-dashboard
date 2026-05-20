import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const ADMIN_API_KEY  = process.env.INVOKER_ADMIN_API_KEY  || '';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const incoming = await request.json();
    const body = { ...incoming, revoked_by: session.user.email };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ADMIN_API_KEY) headers['X-Admin-Api-Key'] = ADMIN_API_KEY;

    const r = await fetch(`${ONBOARDING_URL}/admin/invokers/${params.id}/revoke`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
