import { NextResponse } from 'next/server';

const KEYCLOAK_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
const REALM        = process.env.KEYCLOAK_REALM || 'camara';

export async function POST(request: Request) {
  try {
    const { client_id, client_secret, scope } = await request.json();

    if (!client_id || !client_secret) {
      return NextResponse.json({ error: 'client_id and client_secret are required' }, { status: 400 });
    }

    const body = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id,
      client_secret,
      ...(scope ? { scope } : {}),
    });

    const r = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
