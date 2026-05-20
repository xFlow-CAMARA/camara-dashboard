import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the invoker belongs to this user (or user is admin)
    const isAdmin = session.user.roles?.includes('admin');
    const statusR = await fetch(`${ONBOARDING_URL}/invokers/${params.id}`, { cache: 'no-store' });
    if (!statusR.ok) {
      const data = await statusR.json().catch(() => ({}));
      return NextResponse.json(data, { status: statusR.status });
    }

    if (!isAdmin) {
      const myList = await fetch(`${ONBOARDING_URL}/invokers/by-email/${encodeURIComponent(session.user.email ?? '')}`, { cache: 'no-store' });
      const mine = await myList.json();
      const owns = Array.isArray(mine) && mine.some((i: { invoker_id: string }) => i.invoker_id === params.id);
      if (!owns) return NextResponse.json({ error: 'Forbidden — not your invoker' }, { status: 403 });
    }

    const r = await fetch(`${ONBOARDING_URL}/invokers/${params.id}/credentials`, { cache: 'no-store' });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
