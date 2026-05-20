import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getScopes } from '@/lib/scopes';

const KONG_URL = process.env.KONG_INTERNAL_URL || 'http://kong-gateway:8000';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);

/**
 * Proxy a CAMARA API call through Kong using the Bearer token the
 * developer supplied. Without the session check + path allowlist this
 * route would be an open-relay (any logged-in user could send arbitrary
 * requests to anything Kong fronts).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { path, method = 'GET', token, body } = await request.json();
    if (!path)  return NextResponse.json({ error: 'path required' }, { status: 400 });
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const upMethod = String(method).toUpperCase();
    if (!ALLOWED_METHODS.has(upMethod)) {
      return NextResponse.json({ error: `Method ${upMethod} not allowed` }, { status: 405 });
    }

    const clean = path.startsWith('/') ? path : `/${path}`;

    // Block path-traversal both raw and URL-encoded. Allowlist by prefix would
    // otherwise approve `/quality-on-demand/v1/../../admin/...` and the like.
    if (/(\.\.|%2e%2e|%2f%2f)/i.test(clean) || clean.includes('//')) {
      return NextResponse.json(
        { error: 'Path contains traversal or double slashes' },
        { status: 400 },
      );
    }

    const scopes = await getScopes();
    const allowed = scopes.map(s => `/${s}/`);
    if (!allowed.some(p => clean.startsWith(p))) {
      return NextResponse.json(
        { error: 'Path not allowed via portal', allowed },
        { status: 403 },
      );
    }

    const r = await fetch(`${KONG_URL}${clean}`, {
      method:  upMethod,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    ['GET', 'HEAD'].includes(upMethod) ? undefined : JSON.stringify(body ?? {}),
    });

    const text = await r.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* server returned non-JSON — keep as text */ }
    return NextResponse.json({ status: r.status, body: parsed }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
