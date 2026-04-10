import { execFile } from 'child_process';
import { promisify } from 'util';

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
    args.push('-T4'); // Default aggressive timing
  }

  args.push(target);

  try {
    const { stdout } = await execFileAsync(nmapPath, args, {
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return parseNmapXML(stdout);
  } catch (err) {
    if (err.killed) {
      throw new Error('Scan timed out after 5 minutes');
    }
    throw new Error(`Nmap scan failed: ${err.message}`);
  }
}

function parseNmapXML(xml) {
  const hosts = [];
  const hostMatches = xml.match(/<host[\s\S]*?<\/host>/g) || [];

  for (const hostXml of hostMatches) {
    const host = { ports: [] };

    // Extract IP address
    const addrMatch = hostXml.match(/<address addr="([^"]+)" addrtype="ipv4"/);
    if (addrMatch) host.ip = addrMatch[1];

    // Extract hostname
    const hostnameMatch = hostXml.match(/<hostname name="([^"]+)"/);
    if (hostnameMatch) host.hostname = hostnameMatch[1];

    // Extract state
    const stateMatch = hostXml.match(/<status state="([^"]+)"/);
    if (stateMatch) host.state = stateMatch[1];

    // Extract ports
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
