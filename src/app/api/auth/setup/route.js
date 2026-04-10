import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth';
import { hasUsers, getUsers, saveUsers } from '@/lib/store';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  try {
    const existing = await hasUsers();
    if (existing) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    const { username, password } = await request.json();

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = {
      id: uuidv4(),
      username: username.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    await saveUsers([user]);
    await logAudit('USER_CREATED', { userId: user.id, username: user.username, role: 'admin' });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
