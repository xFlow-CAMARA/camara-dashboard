import { NextResponse } from 'next/server';

const KONG_URL = process.env.KONG_INTERNAL_URL || 'http://kong-gateway:8000';

export async function POST(request: Request) {
  try {
    const { path, method = 'GET', token, body } = await request.json();
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

    const clean = path.startsWith('/') ? path : `/${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const r = await fetch(`${KONG_URL}${clean}`, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : JSON.stringify(body ?? {}),
    });

    const text = await r.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch {}
    return NextResponse.json({ status: r.status, body: parsed }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
