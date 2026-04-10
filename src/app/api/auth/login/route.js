import { NextResponse } from 'next/server';
import { verifyPassword, createSession } from '@/lib/auth';
import { getUsers } from '@/lib/store';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const user = users.find(
      (u) => u.username === username.toLowerCase()
    );

    if (!user) {
      await logAudit('LOGIN_FAILED', { username, reason: 'user not found' });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logAudit('LOGIN_FAILED', { username, reason: 'wrong password' });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await createSession(user.id, user.username);
    await logAudit('LOGIN_SUCCESS', { userId: user.id, username: user.username });

    return NextResponse.json({ success: true, username: user.username });
  } catch (err) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
