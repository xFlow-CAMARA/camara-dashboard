import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const DEV_API_KEY    = process.env.INVOKER_DEV_API_KEY    || '';

function devHeaders(actor?: string): Record<string, string> {
  const h: Record<string, string> = {};
  if (DEV_API_KEY) h['X-Dev-Api-Key'] = DEV_API_KEY;
  if (actor)       h['X-Actor']       = actor;
  return h;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isAdmin = session.user.roles?.includes('admin');
    const statusR = await fetch(`${ONBOARDING_URL}/invokers/${params.id}`,
      { cache: 'no-store', headers: devHeaders() });
    if (!statusR.ok) {
      const data = await statusR.json().catch(() => ({}));
      return NextResponse.json(data, { status: statusR.status });
    }

    if (!isAdmin) {
      const myList = await fetch(
        `${ONBOARDING_URL}/invokers/by-email/${encodeURIComponent(session.user.email ?? '')}`,
        { cache: 'no-store', headers: devHeaders() },
      );
      const mine = await myList.json();
      const owns = Array.isArray(mine) && mine.some((i: { invoker_id: string }) => i.invoker_id === params.id);
      if (!owns) return NextResponse.json({ error: 'Forbidden — not your invoker' }, { status: 403 });
    }

    const r = await fetch(`${ONBOARDING_URL}/invokers/${params.id}/credentials`,
      { cache: 'no-store', headers: devHeaders(session.user.email ?? undefined) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
