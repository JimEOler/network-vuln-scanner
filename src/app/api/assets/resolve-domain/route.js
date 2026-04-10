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

  const { a, cname, mx } = resolution.records;
  const totalRecords = a.length + cname.length + mx.length;

  if (totalRecords === 0) {
    return NextResponse.json(
      { error: `No DNS records found for ${target}` },
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
    resolvedRecords: resolution.records,
    resolvedWith: resolution.tool,
    resolvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: session.username,
  };
  assets.push(domainAsset);
  createdAssets.push(domainAsset);

  // Auto-create IP assets for A records
  for (const ip of a) {
    const exists = assets.some((asset) => asset.target === ip && asset.type === 'ip');
    if (exists) continue;

    const ipAsset = {
      id: uuidv4(),
      name: `${name} - A (${ip})`,
      target: ip,
      type: 'ip',
      recordType: 'A',
      parentDomainId: domainAsset.id,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    };
    assets.push(ipAsset);
    createdAssets.push(ipAsset);
  }

  // Auto-create hostname assets for CNAME records
  for (const host of cname) {
    const exists = assets.some((asset) => asset.target === host && asset.type === 'hostname');
    if (exists) continue;

    const cnameAsset = {
      id: uuidv4(),
      name: `${name} - CNAME (${host})`,
      target: host,
      type: 'hostname',
      recordType: 'CNAME',
      parentDomainId: domainAsset.id,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    };
    assets.push(cnameAsset);
    createdAssets.push(cnameAsset);
  }

  // Auto-create hostname assets for MX records
  for (const host of mx) {
    const exists = assets.some((asset) => asset.target === host && asset.type === 'hostname');
    if (exists) continue;

    const mxAsset = {
      id: uuidv4(),
      name: `${name} - MX (${host})`,
      target: host,
      type: 'hostname',
      recordType: 'MX',
      parentDomainId: domainAsset.id,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    };
    assets.push(mxAsset);
    createdAssets.push(mxAsset);
  }

  await saveAssets(assets);
  await logAudit('DOMAIN_RESOLVED', {
    domainAssetId: domainAsset.id,
    domain: target,
    tool: resolution.tool,
    aRecords: a.length,
    cnameRecords: cname.length,
    mxRecords: mx.length,
    createdAssets: createdAssets.length,
    user: session.username,
  });

  return NextResponse.json({
    domain: domainAsset,
    resolvedWith: resolution.tool,
    records: resolution.records,
    createdAssets,
  }, { status: 201 });
}
