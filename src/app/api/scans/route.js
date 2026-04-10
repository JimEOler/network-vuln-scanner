import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listScans } from '@/lib/store';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scans = await listScans();
  // Return summary list (without full results to keep it lightweight)
  const summaries = scans.map((s) => ({
    id: s.id,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    summary: s.summary,
    triggeredBy: s.triggeredBy,
  }));

  return NextResponse.json(summaries);
}
