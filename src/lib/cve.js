const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

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
    return (data.vulnerabilities || []).map((v) => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] ||
                      cve.metrics?.cvssMetricV30?.[0] ||
                      cve.metrics?.cvssMetricV2?.[0];

      return {
        id: cve.id,
        description: cve.descriptions?.find((d) => d.lang === 'en')?.value || '',
        severity: metrics?.cvssData?.baseSeverity || 'UNKNOWN',
        score: metrics?.cvssData?.baseScore || null,
        published: cve.published,
      };
    });
  } catch {
    return [];
  }
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
