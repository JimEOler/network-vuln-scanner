import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLogs } from '@/lib/logger';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || null;   // DNS, NMAP, BANNER, CVE — comma-separated
  const level = searchParams.get('level') || null;          // INFO, WARN, ERROR, DEBUG — comma-separated
  const limit = parseInt(searchParams.get('limit') || '200', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await getLogs({ category, level, limit, offset });

  return NextResponse.json(result);
}
