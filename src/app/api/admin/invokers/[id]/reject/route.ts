import { NextResponse } from 'next/server';

const ONBOARDING_URL = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const r = await fetch(`${ONBOARDING_URL}/admin/invokers/${params.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
