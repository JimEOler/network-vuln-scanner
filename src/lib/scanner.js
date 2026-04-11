import { execFile } from 'child_process';
import { promisify } from 'util';
import { logNMAP } from '@/lib/logger';

const execFileAsync = promisify(execFile);

function getNmapPath() {
  return process.env.NMAP_PATH || 'nmap';
}

export async function runNmapScan(target, options = {}) {
  const nmapPath = getNmapPath();
  const args = [
    '-sV',           // Service version detection
    '-oX', '-',      // XML output to stdout
    '--open',        // Only show open ports
  ];

  if (options.ports) {
    args.push('-p', options.ports);
  }

  if (options.timing) {
    args.push(`-T${options.timing}`);
  } else {
    args.push('-T4');
  }

  args.push(target);

  const commandStr = `${nmapPath} ${args.join(' ')}`;
  await logNMAP('INFO', `Starting nmap scan: ${commandStr}`, {
    target,
    command: commandStr,
    nmapPath,
    args,
    ports: options.ports || 'default (top 1000)',
    timing: options.timing || 'T4 (aggressive)',
  });

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync(nmapPath, args, {
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const duration = Date.now() - startTime;

    if (stderr) {
      await logNMAP('WARN', `nmap stderr output for ${target}`, { target, stderr: stderr.trim().slice(0, 1000) });
    }

    await logNMAP('DEBUG', `nmap raw XML output for ${target} (${stdout.length} bytes)`, {
      target,
      duration,
      xmlLength: stdout.length,
      xmlPreview: stdout.slice(0, 500),
    });

    const result = parseNmapXML(stdout);

    const totalPorts = result.hosts.reduce((sum, h) => sum + h.ports.length, 0);
    const openPorts = result.hosts.reduce((sum, h) => sum + h.ports.filter((p) => p.state === 'open').length, 0);

    await logNMAP('INFO', `nmap scan completed for ${target} in ${duration}ms`, {
      target,
      duration,
      hostsFound: result.hosts.length,
      totalPorts,
      openPorts,
      hosts: result.hosts.map((h) => ({
        ip: h.ip,
        hostname: h.hostname,
        state: h.state,
        ports: h.ports.map((p) => ({
          port: p.port,
          protocol: p.protocol,
          state: p.state,
          service: p.service,
          product: p.product,
          version: p.version,
        })),
      })),
    });

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;

    if (err.killed) {
      await logNMAP('ERROR', `nmap scan timed out for ${target} after ${duration}ms (5 min limit)`, {
        target,
        duration,
        error: 'Scan timed out after 5 minutes',
        command: commandStr,
      });
      throw new Error('Scan timed out after 5 minutes');
    }

    await logNMAP('ERROR', `nmap scan failed for ${target}: ${err.message}`, {
      target,
      duration,
      error: err.message,
      command: commandStr,
      exitCode: err.code,
      stderr: err.stderr?.slice(0, 1000),
    });
    throw new Error(`Nmap scan failed: ${err.message}`);
  }
}

function parseNmapXML(xml) {
  const hosts = [];
  const hostMatches = xml.match(/<host[\s\S]*?<\/host>/g) || [];

  for (const hostXml of hostMatches) {
    const host = { ports: [] };

    const addrMatch = hostXml.match(/<address addr="([^"]+)" addrtype="ipv4"/);
    if (addrMatch) host.ip = addrMatch[1];

    const hostnameMatch = hostXml.match(/<hostname name="([^"]+)"/);
    if (hostnameMatch) host.hostname = hostnameMatch[1];

    const stateMatch = hostXml.match(/<status state="([^"]+)"/);
    if (stateMatch) host.state = stateMatch[1];

    const portMatches = hostXml.match(/<port[\s\S]*?<\/port>/g) || [];
    for (const portXml of portMatches) {
      const port = {};

      const portIdMatch = portXml.match(/portid="(\d+)"/);
      if (portIdMatch) port.port = parseInt(portIdMatch[1]);

      const protocolMatch = portXml.match(/protocol="([^"]+)"/);
      if (protocolMatch) port.protocol = protocolMatch[1];

      const stateM = portXml.match(/<state state="([^"]+)"/);
      if (stateM) port.state = stateM[1];

      const serviceMatch = portXml.match(/<service name="([^"]*)"(?:\s+product="([^"]*)")?(?:\s+version="([^"]*)")?/);
      if (serviceMatch) {
        port.service = serviceMatch[1];
        port.product = serviceMatch[2] || '';
        port.version = serviceMatch[3] || '';
      }

      host.ports.push(port);
    }

    hosts.push(host);
  }

  return { hosts };
}
