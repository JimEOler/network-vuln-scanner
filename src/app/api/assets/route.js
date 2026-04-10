import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getAssets, saveAssets } from '@/lib/store';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assets = await getAssets();
  return NextResponse.json(assets);
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, target, type } = await request.json();

  if (!name || !target || !type) {
    return NextResponse.json(
      { error: 'Name, target, and type are required' },
      { status: 400 }
    );
  }

  if (!['ip', 'cidr', 'hostname', 'domain'].includes(type)) {
    return NextResponse.json(
      { error: 'Type must be ip, cidr, hostname, or domain' },
      { status: 400 }
    );
  }

  const asset = {
    id: uuidv4(),
    name,
    target,
    type,
    createdAt: new Date().toISOString(),
    createdBy: session.username,
  };

  const assets = await getAssets();
  assets.push(asset);
  await saveAssets(assets);
  await logAudit('ASSET_CREATED', { assetId: asset.id, name, target, user: session.username });

  return NextResponse.json(asset, { status: 201 });
}
