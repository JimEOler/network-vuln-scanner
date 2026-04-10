import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const IPV4_REGEX = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

/**
 * Resolves a domain, returning A, CNAME, and MX records.
 * Tries dig first, falls back to nslookup if dig is unavailable.
 * Returns: { tool: string, records: { a: string[], cname: string[], mx: string[] } }
 */
export async function resolveDomain(domain) {
  // Try dig first
  try {
    const result = await runDig(domain);
    const hasRecords = result.records.a.length > 0 ||
                       result.records.cname.length > 0 ||
                       result.records.mx.length > 0;
    if (hasRecords) return result;
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
  // Run A, CNAME, and MX queries in parallel
  const [aResult, cnameResult, mxResult] = await Promise.all([
    execFileAsync('dig', ['+short', domain, 'A'], { timeout: 15000 }),
    execFileAsync('dig', ['+short', domain, 'CNAME'], { timeout: 15000 }),
    execFileAsync('dig', ['+short', domain, 'MX'], { timeout: 15000 }),
  ]);

  const a = extractIPs(aResult.stdout);

  const cname = aResult.stdout
    .split('\n')
    .map((l) => l.trim().replace(/\.$/, ''))
    .filter((l) => l && !IPV4_REGEX.test(l));
  // Also include explicit CNAME query results
  cnameResult.stdout
    .split('\n')
    .map((l) => l.trim().replace(/\.$/, ''))
    .filter((l) => l)
    .forEach((c) => { if (!cname.includes(c)) cname.push(c); });

  // MX records come as "priority hostname", extract the hostnames
  const mx = mxResult.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
    .map((l) => {
      const parts = l.split(/\s+/);
      // dig MX format: "10 mail.example.com."
      const host = parts.length >= 2 ? parts[1] : parts[0];
      return host.replace(/\.$/, '');
    })
    .filter((h) => h);

  return {
    tool: 'dig',
    records: {
      a: [...new Set(a)],
      cname: [...new Set(cname)],
      mx: [...new Set(mx)],
    },
  };
}

async function runNslookup(domain) {
  // Run A/default, and MX queries
  const [defaultResult, mxResult] = await Promise.all([
    execFileAsync('nslookup', [domain], { timeout: 15000 }),
    execFileAsync('nslookup', ['-type=mx', domain], { timeout: 15000 }).catch(() => ({ stdout: '' })),
  ]);

  // Parse A records and CNAMEs from default nslookup
  const lines = defaultResult.stdout.split('\n');
  const a = [];
  const cname = [];
  let pastNameSection = false;

  for (const line of lines) {
    if (line.includes('Name:')) {
      pastNameSection = true;
      continue;
    }
    if (pastNameSection) {
      const ips = line.match(IPV4_REGEX);
      if (ips) a.push(...ips);
    }
    // nslookup shows CNAMEs as "Aliases: hostname"
    const aliasMatch = line.match(/Aliases?:\s*(.+)/i);
    if (aliasMatch) {
      const alias = aliasMatch[1].trim().replace(/\.$/, '');
      if (alias) cname.push(alias);
    }
    // Also catch "canonical name = ..." lines
    const canonMatch = line.match(/canonical name\s*=\s*(.+)/i);
    if (canonMatch) {
      const canon = canonMatch[1].trim().replace(/\.$/, '');
      if (canon) cname.push(canon);
    }
  }

  // Parse MX records from nslookup -type=mx
  const mx = [];
  const mxLines = mxResult.stdout.split('\n');
  for (const line of mxLines) {
    // nslookup MX format: "mail exchanger = 10 mail.example.com." or "MX preference = 10, mail exchanger = mail.example.com"
    const mxMatch = line.match(/mail exchanger\s*=\s*(?:\d+\s+)?(.+)/i);
    if (mxMatch) {
      const host = mxMatch[1].trim().replace(/\.$/, '');
      if (host) mx.push(host);
    }
  }

  return {
    tool: 'nslookup',
    records: {
      a: [...new Set(a)],
      cname: [...new Set(cname)],
      mx: [...new Set(mx)],
    },
  };
}

function extractIPs(text) {
  const matches = text.match(IPV4_REGEX) || [];
  return [...new Set(matches)];
}
