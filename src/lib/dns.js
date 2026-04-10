import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const IPV4_REGEX = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

export async function resolveDomain(domain) {
  // Try dig first
  try {
    const result = await runDig(domain);
    if (result.addresses.length > 0) return result;
  } catch {
    // dig not available, fall through to nslookup
  }

  // Fallback to nslookup
  try {
    return await runNslookup(domain);
  } catch (err) {
    throw new Error(`DNS resolution failed for ${domain}: ${err.message}`);
  }
}

async function runDig(domain) {
  const { stdout } = await execFileAsync('dig', ['+short', domain], {
    timeout: 15000,
  });

  const addresses = extractIPs(stdout);
  return { tool: 'dig', addresses };
}

async function runNslookup(domain) {
  const { stdout } = await execFileAsync('nslookup', [domain], {
    timeout: 15000,
  });

  // nslookup output has a "Name:" section followed by "Address:" lines.
  // We need to skip the first "Address:" line which is the DNS server itself.
  const lines = stdout.split('\n');
  const addresses = [];
  let pastNameSection = false;

  for (const line of lines) {
    if (line.includes('Name:')) {
      pastNameSection = true;
      continue;
    }
    if (pastNameSection) {
      const ips = line.match(IPV4_REGEX);
      if (ips) addresses.push(...ips);
    }
  }

  // Deduplicate
  const unique = [...new Set(addresses)];
  return { tool: 'nslookup', addresses: unique };
}

function extractIPs(text) {
  const matches = text.match(IPV4_REGEX) || [];
  return [...new Set(matches)];
}
