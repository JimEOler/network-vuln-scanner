import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSchedules, saveSchedules } from '@/lib/store';
import { isValidCron, getNextRun } from '@/lib/scheduler';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const schedules = await getSchedules();
  const index = schedules.findIndex((s) => s.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }

  const schedule = schedules[index];

  if (body.name !== undefined) schedule.name = body.name;
  if (body.assetIds !== undefined) schedule.assetIds = body.assetIds;
  if (body.enabled !== undefined) schedule.enabled = body.enabled;
  if (body.scanOptions !== undefined) schedule.scanOptions = body.scanOptions;

  if (body.cronExpression !== undefined) {
    if (!isValidCron(body.cronExpression)) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
    }
    schedule.cronExpression = body.cronExpression;
    schedule.nextRun = getNextRun(body.cronExpression);
  }

  schedule.updatedAt = new Date().toISOString();
  await saveSchedules(schedules);
  await logAudit('SCHEDULE_UPDATED', { scheduleId: id, user: session.username });

  return NextResponse.json(schedule);
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const schedules = await getSchedules();
  const index = schedules.findIndex((s) => s.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }

  const removed = schedules.splice(index, 1)[0];
  await saveSchedules(schedules);
  await logAudit('SCHEDULE_DELETED', { scheduleId: id, name: removed.name, user: session.username });

  return NextResponse.json({ success: true });
}
