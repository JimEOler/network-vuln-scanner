import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getSchedules, saveSchedules } from '@/lib/store';
import { isValidCron, getNextRun } from '@/lib/scheduler';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schedules = await getSchedules();
  return NextResponse.json(schedules);
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, assetIds, cronExpression, oneTime, scanOptions } = await request.json();

  if (!name || !assetIds?.length) {
    return NextResponse.json(
      { error: 'Name and at least one asset are required' },
      { status: 400 }
    );
  }

  if (!oneTime && !isValidCron(cronExpression)) {
    return NextResponse.json(
      { error: 'Invalid cron expression' },
      { status: 400 }
    );
  }

  const schedule = {
    id: uuidv4(),
    name,
    assetIds,
    cronExpression: oneTime ? null : cronExpression,
    oneTime: !!oneTime,
    scanOptions: scanOptions || {},
    enabled: true,
    nextRun: oneTime ? null : getNextRun(cronExpression),
    lastRun: null,
    createdAt: new Date().toISOString(),
    createdBy: session.username,
  };

  const schedules = await getSchedules();
  schedules.push(schedule);
  await saveSchedules(schedules);
  await logAudit('SCHEDULE_CREATED', { scheduleId: schedule.id, name, user: session.username });

  return NextResponse.json(schedule, { status: 201 });
}
