import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAssets, saveAssets } from '@/lib/store';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { name, target, type } = await request.json();
  const assets = await getAssets();
  const index = assets.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (name) assets[index].name = name;
  if (target) assets[index].target = target;
  if (type) assets[index].type = type;
  assets[index].updatedAt = new Date().toISOString();

  await saveAssets(assets);
  await logAudit('ASSET_UPDATED', { assetId: id, user: session.username });

  return NextResponse.json(assets[index]);
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const assets = await getAssets();
  const index = assets.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const removed = assets.splice(index, 1)[0];
  await saveAssets(assets);
  await logAudit('ASSET_DELETED', { assetId: id, name: removed.name, user: session.username });

  return NextResponse.json({ success: true });
}
