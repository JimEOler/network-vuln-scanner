import { execFile } from 'child_process';
import { promisify } from 'util';
import { logDNS } from '@/lib/logger';

const execFileAsync = promisify(execFile);
const IPV4_REGEX = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

/**
 * Resolves a domain, returning A, CNAME, and MX records.
 * Tries dig first, falls back to nslookup if dig is unavailable.
 */
export async function resolveDomain(domain) {
  await logDNS('INFO', `Starting DNS resolution for ${domain}`, { domain });

  // Try dig first
  try {
    await logDNS('DEBUG', `Attempting dig lookup for ${domain}`, { domain, tool: 'dig' });
    const startTime = Date.now();
    const result = await runDig(domain);
    const duration = Date.now() - startTime;
    const hasRecords = result.records.a.length > 0 ||
                       result.records.cname.length > 0 ||
                       result.records.mx.length > 0;

    if (hasRecords) {
      await logDNS('INFO', `dig resolved ${domain} in ${duration}ms`, {
        domain,
        tool: 'dig',
        duration,
        aRecords: result.records.a,
        cnameRecords: result.records.cname,
        mxRecords: result.records.mx,
        totalRecords: result.records.a.length + result.records.cname.length + result.records.mx.length,
      });
      return result;
    }

    await logDNS('WARN', `dig returned no records for ${domain}, falling back to nslookup`, { domain, duration });
  } catch (err) {
    await logDNS('WARN', `dig not available or failed for ${domain}: ${err.message}`, {
      domain,
      tool: 'dig',
      error: err.message,
    });
  }

  // Fallback to nslookup
  try {
    await logDNS('DEBUG', `Attempting nslookup fallback for ${domain}`, { domain, tool: 'nslookup' });
    const startTime = Date.now();
    const result = await runNslookup(domain);
    const duration = Date.now() - startTime;

    await logDNS('INFO', `nslookup resolved ${domain} in ${duration}ms`, {
      domain,
      tool: 'nslookup',
      duration,
      aRecords: result.records.a,
      cnameRecords: result.records.cname,
      mxRecords: result.records.mx,
      totalRecords: result.records.a.length + result.records.cname.length + result.records.mx.length,
    });

    return result;
  } catch (err) {
    await logDNS('ERROR', `DNS resolution failed for ${domain}: ${err.message}`, {
      domain,
      tool: 'nslookup',
      error: err.message,
    });
    throw new Error(`DNS resolution failed for ${domain}: ${err.message}`);
  }
}

async function runDig(domain) {
  await logDNS('DEBUG', `Executing: dig +short ${domain} A/CNAME/MX (parallel)`, { domain, commands: ['dig +short A', 'dig +short CNAME', 'dig +short MX'] });

  const [aResult, cnameResult, mxResult] = await Promise.all([
    execFileAsync('dig', ['+short', domain, 'A'], { timeout: 15000 }),
    execFileAsync('dig', ['+short', domain, 'CNAME'], { timeout: 15000 }),
    execFileAsync('dig', ['+short', domain, 'MX'], { timeout: 15000 }),
  ]);

  await logDNS('DEBUG', `dig raw output for ${domain}`, {
    domain,
    rawA: aResult.stdout.trim(),
    rawCNAME: cnameResult.stdout.trim(),
    rawMX: mxResult.stdout.trim(),
  });

  const a = extractIPs(aResult.stdout);

  const cname = aResult.stdout
    .split('\n')
    .map((l) => l.trim().replace(/\.$/, ''))
    .filter((l) => l && !IPV4_REGEX.test(l));
  cnameResult.stdout
    .split('\n')
    .map((l) => l.trim().replace(/\.$/, ''))
    .filter((l) => l)
    .forEach((c) => { if (!cname.includes(c)) cname.push(c); });

  const mx = mxResult.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
    .map((l) => {
      const parts = l.split(/\s+/);
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
  await logDNS('DEBUG', `Executing: nslookup ${domain} + nslookup -type=mx ${domain}`, { domain });

  const [defaultResult, mxResult] = await Promise.all([
    execFileAsync('nslookup', [domain], { timeout: 15000 }),
    execFileAsync('nslookup', ['-type=mx', domain], { timeout: 15000 }).catch((err) => {
      logDNS('WARN', `nslookup MX query failed for ${domain}: ${err.message}`, { domain, error: err.message });
      return { stdout: '' };
    }),
  ]);

  await logDNS('DEBUG', `nslookup raw output for ${domain}`, {
    domain,
    rawDefault: defaultResult.stdout.trim().slice(0, 2000),
    rawMX: mxResult.stdout.trim().slice(0, 2000),
  });

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
    const aliasMatch = line.match(/Aliases?:\s*(.+)/i);
    if (aliasMatch) {
      const alias = aliasMatch[1].trim().replace(/\.$/, '');
      if (alias) cname.push(alias);
    }
    const canonMatch = line.match(/canonical name\s*=\s*(.+)/i);
    if (canonMatch) {
      const canon = canonMatch[1].trim().replace(/\.$/, '');
      if (canon) cname.push(canon);
    }
  }

  const mx = [];
  const mxLines = mxResult.stdout.split('\n');
  for (const line of mxLines) {
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
