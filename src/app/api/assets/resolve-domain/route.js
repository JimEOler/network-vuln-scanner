import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getAssets, saveAssets } from '@/lib/store';
import { resolveDomain } from '@/lib/dns';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, target } = await request.json();

  if (!name || !target) {
    return NextResponse.json(
      { error: 'Name and target domain are required' },
      { status: 400 }
    );
  }

  // Resolve domain via dig/nslookup
  let resolution;
  try {
    resolution = await resolveDomain(target);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 422 }
    );
  }

  if (resolution.addresses.length === 0) {
    return NextResponse.json(
      { error: `No IP addresses resolved for ${target}` },
      { status: 422 }
    );
  }

  const assets = await getAssets();
  const createdAssets = [];

  // Create the parent domain asset
  const domainAsset = {
    id: uuidv4(),
    name,
    target,
    type: 'domain',
    resolvedAddresses: resolution.addresses,
    resolvedWith: resolution.tool,
    resolvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: session.username,
  };
  assets.push(domainAsset);
  createdAssets.push(domainAsset);

  // Auto-create IP assets for each resolved address
  for (const ip of resolution.addresses) {
    // Skip if an asset with this IP already exists
    const exists = assets.some((a) => a.target === ip && a.type === 'ip');
    if (exists) continue;

    const ipAsset = {
      id: uuidv4(),
      name: `${name} (${ip})`,
      target: ip,
      type: 'ip',
      parentDomainId: domainAsset.id,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    };
    assets.push(ipAsset);
    createdAssets.push(ipAsset);
  }

  await saveAssets(assets);
  await logAudit('DOMAIN_RESOLVED', {
    domainAssetId: domainAsset.id,
    domain: target,
    tool: resolution.tool,
    addressCount: resolution.addresses.length,
    createdAssets: createdAssets.length,
    user: session.username,
  });

  return NextResponse.json({
    domain: domainAsset,
    resolvedWith: resolution.tool,
    addresses: resolution.addresses,
    createdAssets,
  }, { status: 201 });
}
