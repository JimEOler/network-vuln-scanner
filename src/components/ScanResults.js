'use client';

import { useState } from 'react';

const severityStyle = {
  CRITICAL: 'bg-critical/10 text-critical',
  HIGH: 'bg-high/10 text-high',
  MEDIUM: 'bg-medium/10 text-medium',
  LOW: 'bg-low/10 text-low',
  UNKNOWN: 'bg-info/10 text-info',
};

const severityBorder = {
  CRITICAL: 'border-l-critical',
  HIGH: 'border-l-high',
  MEDIUM: 'border-l-medium',
  LOW: 'border-l-low',
  UNKNOWN: 'border-l-info',
};

const patchLabels = {
  OFFICIAL_FIX: { label: 'Official Fix Available', style: 'bg-success/10 text-success' },
  TEMPORARY_FIX: { label: 'Temporary Mitigation', style: 'bg-warning/10 text-warning' },
  WORKAROUND: { label: 'Workaround Only', style: 'bg-high/10 text-high' },
  UNAVAILABLE: { label: 'No Fix Available', style: 'bg-danger/10 text-danger' },
};

const priorityStyle = {
  P1: 'bg-critical/15 text-critical',
  P2: 'bg-high/15 text-high',
  P3: 'bg-medium/15 text-medium',
  P4: 'bg-low/15 text-low',
};

export default function ScanResults({ scan }) {
  const [expandedHost, setExpandedHost] = useState(null);
  const [expandedPort, setExpandedPort] = useState(null);
  const [expandedCVE, setExpandedCVE] = useState(null);

  if (!scan) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-alt rounded-[8px] p-5 text-center">
          <p className="sx-tile-heading text-text-primary">{scan.summary?.totalHosts || 0}</p>
          <p className="sx-micro text-text-secondary mt-1">Hosts Scanned</p>
        </div>
        <div className="bg-surface-alt rounded-[8px] p-5 text-center">
          <p className="sx-tile-heading text-text-primary">{scan.summary?.totalPorts || 0}</p>
          <p className="sx-micro text-text-secondary mt-1">Open Ports</p>
        </div>
        <div className="bg-surface-alt rounded-[8px] p-5 text-center">
          <p className="sx-tile-heading text-danger">{scan.summary?.totalCVEs || 0}</p>
          <p className="sx-micro text-text-secondary mt-1">CVEs Found</p>
        </div>
      </div>

      {/* Host results */}
      {scan.results?.map((host, i) => (
        <div key={i} className="bg-surface-alt rounded-[8px] overflow-hidden">
          <button
            onClick={() => setExpandedHost(expandedHost === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${host.error ? 'bg-danger' : host.state === 'up' ? 'bg-success' : 'bg-text-tertiary'}`} />
              <div className="text-left">
                <span className="sx-caption-bold text-text-primary">{host.assetName}</span>
                <span className="sx-micro text-text-secondary ml-2 font-mono">{host.ip}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {host.ports && (
                <span className="sx-micro text-text-secondary">{host.ports.length} port{host.ports.length !== 1 ? 's' : ''}</span>
              )}
              <svg className={`w-4 h-4 text-text-tertiary transition-transform ${expandedHost === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedHost === i && (
            <div className="border-t border-border">
              {host.error ? (
                <div className="px-5 py-4 sx-caption text-danger">{host.error}</div>
              ) : host.ports?.length === 0 ? (
                <div className="px-5 py-4 sx-caption text-text-secondary">No open ports discovered</div>
              ) : (
                <div className="divide-y divide-border">
                  {host.ports.map((port, j) => (
                    <div key={j} className="px-5 py-3">
                      <button
                        onClick={() => setExpandedPort(expandedPort === `${i}-${j}` ? null : `${i}-${j}`)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="sx-caption font-mono text-accent">{port.port}/{port.protocol}</span>
                          <span className="sx-caption text-text-primary">{port.service}</span>
                          {port.product && (
                            <span className="sx-micro text-text-secondary">{port.product} {port.version}</span>
                          )}
                        </div>
                        {port.cves?.length > 0 && (
                          <span className="sx-micro px-2 py-0.5 rounded-[980px] bg-danger/10 text-danger">
                            {port.cves.length} CVE{port.cves.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </button>

                      {expandedPort === `${i}-${j}` && (
                        <div className="mt-3 space-y-3">
                          {port.banner && (
                            <div>
                              <p className="sx-micro-bold text-text-secondary mb-1">Banner</p>
                              <pre className="sx-micro bg-surface rounded-[8px] border border-border p-3 overflow-x-auto text-text-primary">
                                {port.banner.slice(0, 500)}
                              </pre>
                            </div>
                          )}

                          {port.cves?.length > 0 && (
                            <div>
                              <p className="sx-micro-bold text-text-secondary mb-2">Vulnerabilities</p>
                              <div className="space-y-3">
                                {port.cves.map((cve) => {
                                  const isExpanded = expandedCVE === `${i}-${j}-${cve.id}`;
                                  const patch = patchLabels[cve.patchLevel] || patchLabels.UNAVAILABLE;

                                  return (
                                    <div
                                      key={cve.id}
                                      className={`rounded-[8px] border-l-4 ${severityBorder[cve.severity] || severityBorder.UNKNOWN} bg-surface-5 overflow-hidden`}
                                    >
                                      {/* CVE header row */}
                                      <button
                                        onClick={() => setExpandedCVE(isExpanded ? null : `${i}-${j}-${cve.id}`)}
                                        className="w-full px-4 py-3 hover:bg-surface-hover transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <a
                                              href={cve.nvdUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="sx-caption-bold font-mono text-link hover:underline"
                                            >
                                              {cve.id}
                                            </a>
                                            <span className={`sx-micro px-2 py-0.5 rounded-[980px] ${severityStyle[cve.severity] || severityStyle.UNKNOWN}`}>
                                              {cve.score} {cve.severity}
                                            </span>
                                            <span className={`sx-micro px-2 py-0.5 rounded-[980px] ${patch.style}`}>
                                              {patch.label}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {cve.remediation?.priority && (
                                              <span className={`sx-micro-bold px-2 py-0.5 rounded-[980px] ${priorityStyle[cve.remediation.priority]}`}>
                                                {cve.remediation.priority}
                                              </span>
                                            )}
                                            <svg className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </div>
                                        </div>
                                        <p className="sx-micro text-text-secondary mt-1.5 text-left line-clamp-2">{cve.description}</p>
                                      </button>

                                      {/* CVE expanded detail */}
                                      {isExpanded && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-border">
                                          {/* CVSS Detail */}
                                          <div className="pt-4">
                                            <p className="sx-micro-bold text-text-secondary mb-2">CVSS Detail</p>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                              {cve.cvssVersion && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">CVSS Version</span>
                                                  <span className="sx-micro text-text-primary">{cve.cvssVersion}</span>
                                                </div>
                                              )}
                                              {cve.attackVector && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Attack Vector</span>
                                                  <span className="sx-micro text-text-primary">{cve.attackVector}</span>
                                                </div>
                                              )}
                                              {cve.attackComplexity && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Attack Complexity</span>
                                                  <span className="sx-micro text-text-primary">{cve.attackComplexity}</span>
                                                </div>
                                              )}
                                              {cve.privilegesRequired && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Privileges Required</span>
                                                  <span className="sx-micro text-text-primary">{cve.privilegesRequired}</span>
                                                </div>
                                              )}
                                              {cve.userInteraction && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">User Interaction</span>
                                                  <span className="sx-micro text-text-primary">{cve.userInteraction}</span>
                                                </div>
                                              )}
                                              {cve.scope && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Scope</span>
                                                  <span className="sx-micro text-text-primary">{cve.scope}</span>
                                                </div>
                                              )}
                                              {cve.confidentialityImpact && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Confidentiality</span>
                                                  <span className="sx-micro text-text-primary">{cve.confidentialityImpact}</span>
                                                </div>
                                              )}
                                              {cve.integrityImpact && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Integrity</span>
                                                  <span className="sx-micro text-text-primary">{cve.integrityImpact}</span>
                                                </div>
                                              )}
                                              {cve.availabilityImpact && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Availability</span>
                                                  <span className="sx-micro text-text-primary">{cve.availabilityImpact}</span>
                                                </div>
                                              )}
                                              {cve.exploitabilityScore != null && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Exploitability</span>
                                                  <span className="sx-micro text-text-primary">{cve.exploitabilityScore}</span>
                                                </div>
                                              )}
                                              {cve.impactScore != null && (
                                                <div className="flex justify-between">
                                                  <span className="sx-micro text-text-tertiary">Impact Score</span>
                                                  <span className="sx-micro text-text-primary">{cve.impactScore}</span>
                                                </div>
                                              )}
                                            </div>
                                            {cve.cvssVector && (
                                              <div className="mt-2">
                                                <span className="sx-micro text-text-tertiary">Vector: </span>
                                                <span className="sx-micro font-mono text-text-secondary break-all">{cve.cvssVector}</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Weaknesses */}
                                          {cve.weaknesses?.length > 0 && (
                                            <div>
                                              <p className="sx-micro-bold text-text-secondary mb-1.5">Weaknesses</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {cve.weaknesses.map((cwe) => (
                                                  <a
                                                    key={cwe}
                                                    href={`https://cwe.mitre.org/data/definitions/${cwe.replace('CWE-', '')}.html`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="sx-micro font-mono px-2 py-0.5 rounded-[980px] bg-accent/10 text-link hover:underline"
                                                  >
                                                    {cwe}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Dates */}
                                          <div className="grid grid-cols-2 gap-x-6">
                                            {cve.published && (
                                              <div className="flex justify-between">
                                                <span className="sx-micro text-text-tertiary">Published</span>
                                                <span className="sx-micro text-text-primary">{new Date(cve.published).toLocaleDateString()}</span>
                                              </div>
                                            )}
                                            {cve.lastModified && (
                                              <div className="flex justify-between">
                                                <span className="sx-micro text-text-tertiary">Last Modified</span>
                                                <span className="sx-micro text-text-primary">{new Date(cve.lastModified).toLocaleDateString()}</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Remediation */}
                                          {cve.remediation && (
                                            <div className="bg-surface rounded-[8px] border border-border p-4 space-y-3">
                                              <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="sx-caption-bold text-text-primary">How to Fix</span>
                                                <span className={`sx-micro-bold px-2 py-0.5 rounded-[980px] ${priorityStyle[cve.remediation.priority]}`}>
                                                  {cve.remediation.priority} — {cve.remediation.urgency}
                                                </span>
                                              </div>

                                              <p className="sx-caption text-text-primary">{cve.remediation.summary}</p>

                                              <div>
                                                <p className="sx-micro-bold text-text-secondary mb-1.5">Remediation Steps</p>
                                                <ol className="list-decimal list-inside space-y-1.5">
                                                  {cve.remediation.steps.map((step, si) => (
                                                    <li key={si} className="sx-micro text-text-primary leading-relaxed">
                                                      {step.startsWith('http') || step.includes('http') ? (
                                                        <span className="break-all">{step}</span>
                                                      ) : step}
                                                    </li>
                                                  ))}
                                                </ol>
                                              </div>

                                              {cve.remediation.mitigations?.length > 0 && (
                                                <div>
                                                  <p className="sx-micro-bold text-text-secondary mb-1.5">Interim Mitigations</p>
                                                  <ul className="space-y-1.5">
                                                    {cve.remediation.mitigations.map((m, mi) => (
                                                      <li key={mi} className="sx-micro text-text-primary flex gap-2">
                                                        <span className="text-warning mt-0.5 shrink-0">&#9670;</span>
                                                        <span className="leading-relaxed">{m}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Patch / Advisory Links */}
                                          {cve.patchUrls?.length > 0 && (
                                            <div>
                                              <p className="sx-micro-bold text-text-secondary mb-1.5">Patch & Vendor Advisories</p>
                                              <div className="space-y-1">
                                                {cve.patchUrls.map((ref, ri) => (
                                                  <a
                                                    key={ri}
                                                    href={ref.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="sx-micro text-link hover:underline flex items-center gap-1.5 break-all"
                                                  >
                                                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    {ref.url}
                                                    {ref.tags?.length > 0 && (
                                                      <span className="sx-micro text-text-tertiary ml-1">({ref.tags.join(', ')})</span>
                                                    )}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Known Exploit References */}
                                          {cve.exploitUrls?.length > 0 && (
                                            <div>
                                              <p className="sx-micro-bold text-danger mb-1.5">Known Exploit References</p>
                                              <div className="space-y-1">
                                                {cve.exploitUrls.map((ref, ri) => (
                                                  <a
                                                    key={ri}
                                                    href={ref.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="sx-micro text-danger hover:underline flex items-center gap-1.5 break-all"
                                                  >
                                                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                    {ref.url}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* NVD Full Detail Link */}
                                          <div className="pt-2 border-t border-border">
                                            <a
                                              href={cve.nvdUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="sx-caption text-link hover:underline flex items-center gap-1.5"
                                            >
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                              View full details on NVD
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
