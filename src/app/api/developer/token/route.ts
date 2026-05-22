import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { take } from '@/lib/rate-limit';

const KEYCLOAK_URL    = process.env.KEYCLOAK_INTERNAL_URL  || 'http://keycloak:8080';
const REALM           = process.env.KEYCLOAK_REALM         || 'camara';
const ONBOARDING_URL  = process.env.INVOKER_ONBOARDING_URL || 'http://invoker-onboarding:8080';
const DEV_API_KEY     = process.env.INVOKER_DEV_API_KEY    || '';

function devHeaders(): Record<string, string> {
  return DEV_API_KEY ? { 'X-Dev-Api-Key': DEV_API_KEY } : {};
}

/**
 * Exchange Keycloak client credentials for an access token.
 *
 * Authorisation:
 *  - Must be a logged-in session.
 *  - The Keycloak client_id is the same as the invoker_id (see keycloak_bridge.py).
 *    Either the session user owns that invoker (submitted_by.email matches) or
 *    the session has the `admin` role.
 * Without these checks the route is a brute-force oracle against any client
 * secret in the realm.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Speed-bump against credential brute-force: 10 tokens, refill 1/sec.
  // Generous for normal "request a token while developing" use, prohibitive
  // for guessing secrets in a loop.
  const rl = take(`token:${session.user.email}`, { capacity: 10, refillRate: 1 });
  if (!rl.allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  try {
    const { client_id, client_secret, scope } = await request.json();

    if (!client_id || !client_secret) {
      return NextResponse.json({ error: 'client_id and client_secret are required' }, { status: 400 });
    }

    const isAdmin = session.user.roles?.includes('admin') ?? false;
    if (!isAdmin) {
      // Single round-trip: if the by-email list contains the client_id,
      // the invoker both exists AND belongs to this user.
      const mineR = await fetch(
        `${ONBOARDING_URL}/invokers/by-email/${encodeURIComponent(session.user.email)}`,
        { cache: 'no-store', headers: devHeaders() },
      );
      const mine = await mineR.json();
      const owns = Array.isArray(mine) && mine.some((i: { invoker_id: string }) => i.invoker_id === client_id);
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden — not your invoker' }, { status: 403 });
      }
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
