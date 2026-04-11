import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getAssets, saveScan, getSchedules, saveSchedules } from '@/lib/store';
import { runNmapScan } from '@/lib/scanner';
import { grabBanners } from '@/lib/banner';
import { lookupCVEs } from '@/lib/cve';
import { logAudit } from '@/lib/audit';
import { logBANNER, logCVE, logNMAP } from '@/lib/logger';

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assetIds, scheduleId } = await request.json();

  if (!assetIds?.length) {
    return NextResponse.json({ error: 'At least one asset is required' }, { status: 400 });
  }

  const allAssets = await getAssets();
  const targets = allAssets.filter((a) => assetIds.includes(a.id));

  if (targets.length === 0) {
    return NextResponse.json({ error: 'No valid assets found' }, { status: 400 });
  }

  const scanId = uuidv4();
  const scan = {
    id: scanId,
    scheduleId: scheduleId || null,
    assetIds,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: [],
    summary: { totalHosts: 0, totalPorts: 0, totalCVEs: 0 },
    triggeredBy: session.username,
  };

  await saveScan(scanId, scan);
  await logAudit('SCAN_STARTED', { scanId, assetIds, user: session.username });

  // Run scan async — don't block the response
  runScanAsync(scanId, targets, scheduleId).catch((err) => {
    console.error('Scan failed:', err);
  });

  return NextResponse.json({ scanId, status: 'running' }, { status: 202 });
}

async function runScanAsync(scanId, targets, scheduleId) {
  const results = [];
  let totalPorts = 0;
  let totalCVEs = 0;

  await logNMAP('INFO', `Scan pipeline started (scanId: ${scanId})`, {
    scanId,
    targetCount: targets.length,
    targets: targets.map((t) => ({ id: t.id, name: t.name, target: t.target, type: t.type })),
  });

  for (const target of targets) {
    try {
      // Run nmap scan (logging is inside scanner.js)
      const nmapResult = await runNmapScan(target.target);

      for (const host of nmapResult.hosts) {
        // Grab banners for discovered ports
        const openPorts = host.ports.filter((p) => p.state === 'open').map((p) => p.port);

        let banners = {};
        if (openPorts.length > 0) {
          const hostAddr = host.ip || target.target;
          await logBANNER('INFO', `Grabbing banners for ${hostAddr} on ${openPorts.length} port(s)`, {
            scanId,
            host: hostAddr,
            ports: openPorts,
          });

          const bannerStart = Date.now();
          banners = await grabBanners(hostAddr, openPorts);
          const bannerDuration = Date.now() - bannerStart;
          const bannersFound = Object.keys(banners).length;

          await logBANNER('INFO', `Banner grab completed for ${hostAddr} in ${bannerDuration}ms`, {
            scanId,
            host: hostAddr,
            duration: bannerDuration,
            bannersFound,
            portsWithBanners: Object.keys(banners).map(Number),
            bannerPreviews: Object.fromEntries(
              Object.entries(banners).map(([port, b]) => [port, b.slice(0, 200)])
            ),
          });
        }

        // Look up CVEs for each service
        const portsWithCVEs = [];
        for (const port of host.ports) {
          let cves = [];
          if (port.product) {
            const cveQuery = `${port.product} ${port.version}`.trim();
            await logCVE('INFO', `Looking up CVEs for ${cveQuery} on port ${port.port}`, {
              scanId,
              host: host.ip || target.target,
              port: port.port,
              product: port.product,
              version: port.version,
              query: cveQuery,
            });

            const cveStart = Date.now();
            cves = await lookupCVEs(port.product, port.version);
            const cveDuration = Date.now() - cveStart;
            totalCVEs += cves.length;

            await logCVE('INFO', `CVE lookup completed for ${cveQuery}: ${cves.length} found in ${cveDuration}ms`, {
              scanId,
              host: host.ip || target.target,
              port: port.port,
              product: port.product,
              version: port.version,
              duration: cveDuration,
              cveCount: cves.length,
              cves: cves.map((c) => ({
                id: c.id,
                severity: c.severity,
                score: c.score,
                patchLevel: c.patchLevel,
              })),
            });
          }

          portsWithCVEs.push({
            ...port,
            banner: banners[port.port] || null,
            cves,
          });
          totalPorts++;
        }

        results.push({
          assetId: target.id,
          assetName: target.name,
          ip: host.ip || target.target,
          hostname: host.hostname || target.target,
          state: host.state,
          ports: portsWithCVEs,
        });
      }
    } catch (err) {
      await logNMAP('ERROR', `Scan failed for target ${target.name} (${target.target}): ${err.message}`, {
        scanId,
        assetId: target.id,
        target: target.target,
        error: err.message,
      });

      results.push({
        assetId: target.id,
        assetName: target.name,
        ip: target.target,
        error: err.message,
      });
    }
  }

  const scan = {
    id: scanId,
    scheduleId,
    status: 'completed',
    startedAt: (await import('@/lib/store').then((m) => m.getScan(scanId)))?.startedAt,
    completedAt: new Date().toISOString(),
    results,
    summary: {
      totalHosts: results.length,
      totalPorts,
      totalCVEs,
    },
  };

  await saveScan(scanId, scan);

  // Update schedule lastRun
  if (scheduleId) {
    const schedules = await getSchedules();
    const idx = schedules.findIndex((s) => s.id === scheduleId);
    if (idx !== -1) {
      schedules[idx].lastRun = new Date().toISOString();
      await saveSchedules(schedules);
    }
  }

  await logNMAP('INFO', `Scan pipeline completed (scanId: ${scanId})`, {
    scanId,
    totalHosts: results.length,
    totalPorts,
    totalCVEs,
  });

  await logAudit('SCAN_COMPLETED', { scanId, totalHosts: results.length, totalPorts, totalCVEs });
}
