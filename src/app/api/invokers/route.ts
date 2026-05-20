import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Single invoker by id
  if (id) {
    try {
      const r = await fetch(`${ONBOARDING_URL}/invokers/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await r.json();
      return NextResponse.json(data, { status: r.status });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 502 });
    }
  }

  // List by logged-in user (admins go via /api/admin/invokers; this is dev-side)
  const email = session.user.email ?? '';
  if (!email) return NextResponse.json([], { status: 200 });

  try {
    const r = await fetch(`${ONBOARDING_URL}/invokers/by-email/${encodeURIComponent(email)}`, { cache: 'no-store' });
    if (r.status === 404) return NextResponse.json([], { status: 200 });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Override contact_email with authenticated user — developers can't impersonate
    const merged = { ...body, contact_email: session.user.email };

    const r = await fetch(`${ONBOARDING_URL}/invokers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
