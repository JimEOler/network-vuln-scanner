import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST() {
  try {
    const session = await getSession();
    await destroySession();
    if (session) {
      await logAudit('LOGOUT', { userId: session.userId, username: session.username });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
