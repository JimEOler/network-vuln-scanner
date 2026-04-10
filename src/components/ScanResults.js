'use client';

import { useState } from 'react';

const severityColors = {
  CRITICAL: 'bg-critical/10 text-critical border-critical/20',
  HIGH: 'bg-high/10 text-high border-high/20',
  MEDIUM: 'bg-medium/10 text-medium border-medium/20',
  LOW: 'bg-low/10 text-low border-low/20',
  UNKNOWN: 'bg-info/10 text-info border-info/20',
};

export default function ScanResults({ scan }) {
  const [expandedHost, setExpandedHost] = useState(null);
  const [expandedPort, setExpandedPort] = useState(null);

  if (!scan) return null;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-alt rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{scan.summary?.totalHosts || 0}</p>
          <p className="text-xs text-text-secondary mt-1">Hosts Scanned</p>
        </div>
        <div className="bg-surface-alt rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{scan.summary?.totalPorts || 0}</p>
          <p className="text-xs text-text-secondary mt-1">Open Ports</p>
        </div>
        <div className="bg-surface-alt rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-danger">{scan.summary?.totalCVEs || 0}</p>
          <p className="text-xs text-text-secondary mt-1">CVEs Found</p>
        </div>
      </div>

      {/* Host results */}
      {scan.results?.map((host, i) => (
        <div key={i} className="bg-surface-alt rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setExpandedHost(expandedHost === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${host.error ? 'bg-danger' : host.state === 'up' ? 'bg-success' : 'bg-text-secondary'}`} />
              <div className="text-left">
                <span className="text-sm font-medium text-text-primary">{host.assetName}</span>
                <span className="text-xs text-text-secondary ml-2 font-mono">{host.ip}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {host.ports && (
                <span className="text-xs text-text-secondary">
                  {host.ports.length} port{host.ports.length !== 1 ? 's' : ''}
                </span>
              )}
              <svg
                className={`w-4 h-4 text-text-secondary transition-transform ${expandedHost === i ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedHost === i && (
            <div className="border-t border-border">
              {host.error ? (
                <div className="px-5 py-4 text-sm text-danger">{host.error}</div>
              ) : host.ports?.length === 0 ? (
                <div className="px-5 py-4 text-sm text-text-secondary">No open ports discovered</div>
              ) : (
                <div className="divide-y divide-border">
                  {host.ports.map((port, j) => (
                    <div key={j} className="px-5 py-3">
                      <button
                        onClick={() => setExpandedPort(expandedPort === `${i}-${j}` ? null : `${i}-${j}`)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-accent">{port.port}/{port.protocol}</span>
                          <span className="text-sm text-text-primary">{port.service}</span>
                          {port.product && (
                            <span className="text-xs text-text-secondary">
                              {port.product} {port.version}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {port.cves?.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                              {port.cves.length} CVE{port.cves.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </button>

                      {expandedPort === `${i}-${j}` && (
                        <div className="mt-3 space-y-3">
                          {port.banner && (
                            <div>
                              <p className="text-xs font-medium text-text-secondary mb-1">Banner</p>
                              <pre className="text-xs bg-surface rounded-lg border border-border p-3 overflow-x-auto text-text-primary">
                                {port.banner.slice(0, 500)}
                              </pre>
                            </div>
                          )}

                          {port.cves?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-text-secondary mb-2">Vulnerabilities</p>
                              <div className="space-y-2">
                                {port.cves.map((cve) => (
                                  <div
                                    key={cve.id}
                                    className={`rounded-lg border px-3 py-2 ${severityColors[cve.severity] || severityColors.UNKNOWN}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-mono font-medium">{cve.id}</span>
                                      <div className="flex items-center gap-2">
                                        {cve.score && (
                                          <span className="text-xs font-bold">{cve.score}</span>
                                        )}
                                        <span className="text-xs">{cve.severity}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs mt-1 opacity-80 line-clamp-2">
                                      {cve.description}
                                    </p>
                                  </div>
                                ))}
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
