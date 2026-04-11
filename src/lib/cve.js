const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

/**
 * Look up CVEs for a given product and version via the NVD REST API v2.
 * Returns enriched CVE objects with:
 *   - id, description, severity, score
 *   - cvssVector (full CVSS v3.x or v2 vector string)
 *   - attackVector, attackComplexity, privilegesRequired, userInteraction (CVSS breakdown)
 *   - exploitabilityScore, impactScore
 *   - patchLevel: "OFFICIAL_FIX" | "TEMPORARY_FIX" | "WORKAROUND" | "UNAVAILABLE"
 *   - nvdUrl: direct link to the NVD detail page
 *   - references: array of { url, source, tags[] }
 *   - weaknesses: CWE IDs (e.g. CWE-79)
 *   - published, lastModified
 *   - remediation: human-readable guidance object
 */
export async function lookupCVEs(product, version) {
  if (!product) return [];

  try {
    const params = new URLSearchParams({
      keywordSearch: `${product} ${version}`.trim(),
      resultsPerPage: '10',
    });

    const headers = {};
    if (process.env.NVD_API_KEY) {
      headers['apiKey'] = process.env.NVD_API_KEY;
    }

    const res = await fetch(`${NVD_BASE}?${params}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.vulnerabilities || []).map((v) => enrichCVE(v.cve, product, version));
  } catch {
    return [];
  }
}

function enrichCVE(cve, product, version) {
  // ── CVSS metrics (prefer v3.1 > v3.0 > v2) ──
  const metricsV31 = cve.metrics?.cvssMetricV31?.[0];
  const metricsV30 = cve.metrics?.cvssMetricV30?.[0];
  const metricsV2 = cve.metrics?.cvssMetricV2?.[0];
  const metrics = metricsV31 || metricsV30 || metricsV2;
  const cvssData = metrics?.cvssData || {};

  const severity = cvssData.baseSeverity || 'UNKNOWN';
  const score = cvssData.baseScore || null;
  const cvssVersion = cvssData.version || (metricsV31 ? '3.1' : metricsV30 ? '3.0' : metricsV2 ? '2.0' : null);
  const cvssVector = cvssData.vectorString || null;

  // ── CVSS v3 breakdown ──
  const attackVector = cvssData.attackVector || null;
  const attackComplexity = cvssData.attackComplexity || null;
  const privilegesRequired = cvssData.privilegesRequired || null;
  const userInteraction = cvssData.userInteraction || null;
  const scope = cvssData.scope || null;
  const confidentialityImpact = cvssData.confidentialityImpact || null;
  const integrityImpact = cvssData.integrityImpact || null;
  const availabilityImpact = cvssData.availabilityImpact || null;

  const exploitabilityScore = metrics?.exploitabilityScore || null;
  const impactScore = metrics?.impactScore || null;

  // ── Description ──
  const description = cve.descriptions?.find((d) => d.lang === 'en')?.value || '';

  // ── Weaknesses (CWE IDs) ──
  const weaknesses = [];
  for (const w of cve.weaknesses || []) {
    for (const d of w.description || []) {
      if (d.value && d.value !== 'NVD-CWE-Other' && d.value !== 'NVD-CWE-noinfo') {
        weaknesses.push(d.value);
      }
    }
  }

  // ── References — extract URLs, sources, and tags ──
  const references = (cve.references || []).map((ref) => ({
    url: ref.url,
    source: ref.source || null,
    tags: ref.tags || [],
  }));

  // ── Determine patch level from reference tags ──
  const patchLevel = determinePatchLevel(references);

  // ── Patch / fix references ──
  const patchUrls = references.filter((r) =>
    r.tags.some((t) => ['Patch', 'Vendor Advisory', 'Mitigation'].includes(t))
  );
  const exploitUrls = references.filter((r) =>
    r.tags.some((t) => ['Exploit', 'Third Party Advisory'].includes(t))
  );

  // ── NVD detail URL ──
  const nvdUrl = `https://nvd.nist.gov/vuln/detail/${cve.id}`;

  // ── Build remediation guidance ──
  const remediation = buildRemediation({
    cveId: cve.id,
    product,
    version,
    severity,
    score,
    patchLevel,
    patchUrls,
    attackVector,
    attackComplexity,
    privilegesRequired,
    userInteraction,
    weaknesses,
    description,
  });

  return {
    id: cve.id,
    description,
    severity,
    score,
    cvssVersion,
    cvssVector,
    attackVector,
    attackComplexity,
    privilegesRequired,
    userInteraction,
    scope,
    confidentialityImpact,
    integrityImpact,
    availabilityImpact,
    exploitabilityScore,
    impactScore,
    weaknesses,
    patchLevel,
    nvdUrl,
    references,
    patchUrls,
    exploitUrls,
    published: cve.published,
    lastModified: cve.lastModified,
    remediation,
  };
}

/**
 * Determine patch availability from NVD reference tags.
 *  - OFFICIAL_FIX  → "Patch" or "Vendor Advisory" tag found
 *  - TEMPORARY_FIX → "Mitigation" tag found
 *  - WORKAROUND    → "Third Party Advisory" tag found (but no Patch)
 *  - UNAVAILABLE   → no fix-related tags
 */
function determinePatchLevel(references) {
  const allTags = references.flatMap((r) => r.tags);
  if (allTags.includes('Patch') || allTags.includes('Vendor Advisory')) return 'OFFICIAL_FIX';
  if (allTags.includes('Mitigation')) return 'TEMPORARY_FIX';
  if (allTags.includes('Third Party Advisory')) return 'WORKAROUND';
  return 'UNAVAILABLE';
}

/**
 * Build actionable remediation guidance based on CVE details.
 * Returns an object with:
 *   - priority:     "P1" | "P2" | "P3" | "P4"
 *   - urgency:      human-readable urgency label
 *   - summary:      one-line summary of what to do
 *   - steps:        array of specific remediation steps
 *   - mitigations:  interim mitigations if no patch is available
 */
function buildRemediation({ cveId, product, version, severity, score, patchLevel, patchUrls, attackVector, attackComplexity, privilegesRequired, userInteraction, weaknesses, description }) {
  // ── Priority based on CVSS score + exploitability ──
  let priority, urgency;
  if (score >= 9.0) {
    priority = 'P1';
    urgency = 'IMMEDIATE — patch within 24 hours';
  } else if (score >= 7.0) {
    priority = 'P2';
    urgency = 'HIGH — patch within 7 days';
  } else if (score >= 4.0) {
    priority = 'P3';
    urgency = 'MODERATE — patch within 30 days';
  } else {
    priority = 'P4';
    urgency = 'LOW — patch at next maintenance window';
  }

  // Elevate priority if network-exploitable with no auth required
  if (attackVector === 'NETWORK' && privilegesRequired === 'NONE' && score >= 7.0) {
    if (priority !== 'P1') {
      priority = 'P1';
      urgency = 'IMMEDIATE — network-exploitable with no authentication required';
    }
  }

  // ── Remediation summary ──
  let summary;
  switch (patchLevel) {
    case 'OFFICIAL_FIX':
      summary = `Update ${product} from version ${version || '(unknown)'} to the latest patched release.`;
      break;
    case 'TEMPORARY_FIX':
      summary = `Apply the vendor-provided mitigation for ${product}. A full patch may not yet be available.`;
      break;
    case 'WORKAROUND':
      summary = `No official patch available. Apply third-party workarounds for ${product} and monitor for vendor updates.`;
      break;
    default:
      summary = `No known fix for ${cveId}. Implement compensating controls and monitor for vendor patches.`;
  }

  // ── Remediation steps ──
  const steps = [];

  // Step 1: always identify affected systems
  steps.push(`Identify all instances of ${product}${version ? ` ${version}` : ''} in your environment.`);

  // Step 2: patch or mitigation
  if (patchLevel === 'OFFICIAL_FIX') {
    steps.push(`Download and apply the official patch from the vendor.`);
    if (patchUrls.length > 0) {
      steps.push(`Vendor/patch advisories: ${patchUrls.map((p) => p.url).join(', ')}`);
    }
  } else if (patchLevel === 'TEMPORARY_FIX') {
    steps.push(`Apply the vendor-provided temporary mitigation.`);
    if (patchUrls.length > 0) {
      steps.push(`Mitigation references: ${patchUrls.map((p) => p.url).join(', ')}`);
    }
    steps.push(`Subscribe to vendor security bulletins for a permanent fix.`);
  } else {
    steps.push(`No official fix is currently available. Monitor ${`https://nvd.nist.gov/vuln/detail/${cveId}`} for updates.`);
  }

  // Step 3: Verify after patching
  steps.push(`After remediation, re-scan the affected host to confirm ${cveId} is resolved.`);

  // Step 4: Document
  steps.push(`Document the remediation in your change management system.`);

  // ── Interim mitigations (when no patch or high severity) ──
  const mitigations = [];

  if (attackVector === 'NETWORK') {
    mitigations.push('Restrict network access to the affected service using firewall rules or network segmentation.');
    mitigations.push('Place the affected service behind a reverse proxy or WAF if web-facing.');
  }

  if (privilegesRequired === 'NONE' && userInteraction === 'NONE') {
    mitigations.push('This vulnerability requires no authentication or user interaction — prioritize isolation of the affected system.');
  }

  if (userInteraction === 'REQUIRED') {
    mitigations.push('Educate users about phishing and social engineering vectors that could trigger exploitation.');
  }

  // CWE-specific mitigations
  for (const cwe of weaknesses) {
    const cweMitigation = getCWEMitigation(cwe);
    if (cweMitigation) mitigations.push(cweMitigation);
  }

  if (patchLevel === 'UNAVAILABLE') {
    mitigations.push('Consider disabling or replacing the affected software if a fix is not forthcoming.');
    mitigations.push('Enable enhanced logging and monitoring on the affected service to detect exploitation attempts.');
  }

  return {
    priority,
    urgency,
    summary,
    steps,
    mitigations,
  };
}

/**
 * Return a mitigation suggestion based on a CWE category.
 */
function getCWEMitigation(cwe) {
  const mitigations = {
    'CWE-79':  'Implement Content Security Policy (CSP) headers and sanitize all user input to mitigate cross-site scripting (XSS).',
    'CWE-89':  'Use parameterized queries or prepared statements to prevent SQL injection. Never concatenate user input into queries.',
    'CWE-22':  'Validate and sanitize file paths. Use allowlists for permitted directories and reject path traversal sequences (../).',
    'CWE-78':  'Avoid passing user input to OS commands. If required, use strict allowlists and escape shell metacharacters.',
    'CWE-287': 'Review and strengthen authentication mechanisms. Enforce multi-factor authentication where possible.',
    'CWE-306': 'Ensure all sensitive endpoints require authentication. Audit access controls and enforce least privilege.',
    'CWE-502': 'Do not deserialize untrusted data. Use safe serialization formats (JSON) and validate all deserialized objects.',
    'CWE-611': 'Disable external entity processing in XML parsers. Use JSON instead of XML where possible.',
    'CWE-918': 'Validate and restrict outbound requests from the server (SSRF). Use allowlists for permitted domains and IP ranges.',
    'CWE-200': 'Review error handling to prevent information disclosure. Use generic error messages in production.',
    'CWE-352': 'Implement anti-CSRF tokens on all state-changing requests. Validate the Origin and Referer headers.',
    'CWE-434': 'Validate uploaded file types, size, and content. Store uploads outside the webroot and serve via a separate domain.',
    'CWE-269': 'Audit privilege assignments. Apply the principle of least privilege across all roles and service accounts.',
    'CWE-862': 'Implement proper authorization checks on all endpoints. Do not rely solely on client-side access controls.',
    'CWE-120': 'Use bounds-checked functions and modern memory-safe languages. Enable compiler protections (ASLR, stack canaries).',
    'CWE-190': 'Validate all integer inputs for range. Use safe integer arithmetic libraries to prevent overflow conditions.',
    'CWE-416': 'Enable memory safety tooling (AddressSanitizer). Upgrade to patched versions that address use-after-free conditions.',
    'CWE-476': 'Implement null-pointer checks before dereferencing. Use static analysis tools to catch null-pointer issues.',
    'CWE-770': 'Implement rate limiting and resource quotas to prevent denial-of-service via resource exhaustion.',
    'CWE-798': 'Remove hard-coded credentials. Use environment variables, secrets management, or a vault for all credentials.',
    'CWE-94':  'Do not evaluate user-controlled input as code. Use sandboxing and strict input validation.',
    'CWE-400': 'Implement rate limiting, request size limits, and timeouts to mitigate denial-of-service attacks.',
  };
  return mitigations[cwe] || null;
}

export async function searchExploitDB(query) {
  const baseUrl = process.env.EXPLOIT_DB_BASE_URL || 'https://www.exploit-db.com';

  try {
    const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}
