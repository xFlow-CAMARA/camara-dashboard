import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

const TF_SDK_URL = process.env.TF_SDK_URL || 'http://kong-gateway:8000';
// The history endpoint is exposed by tf-sdk-api directly (not via Kong)
const TF_SDK_DIRECT = process.env.TF_SDK_DIRECT_URL || 'http://tf-sdk-api:8200';

// Map CAMARA scope names → tf-sdk-api history paths
const HISTORY_PATH: Record<string, string> = {
  'quality-on-demand':           '/history/qod',
  'location-retrieval':          '/history/location',
  'traffic-influence':           '/history/traffic-influence',
  'number-verification':         '/history/number-verification',
  'device-status':               '/history/device-status',
  'device-reachability-status':  '/history/device-status',
  'sim-swap':                    '/history/sim-swap',
};

export async function GET(_req: Request, { params }: { params: { api: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const historyPath = HISTORY_PATH[params.api];
  if (!historyPath) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  try {
    const r = await fetch(`${TF_SDK_DIRECT}${historyPath}?limit=20`, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json({ data: [], error: `Backend ${r.status}` }, { status: 200 });
    }
    const payload = await r.json();
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ data: [], error: String(e) }, { status: 200 });
  }
}
