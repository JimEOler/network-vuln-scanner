'use client';

import { useState } from 'react';

const severityStyle = {
  CRITICAL: 'bg-critical/10 text-critical',
  HIGH: 'bg-high/10 text-high',
  MEDIUM: 'bg-medium/10 text-medium',
  LOW: 'bg-low/10 text-low',
  UNKNOWN: 'bg-info/10 text-info',
};

export default function ScanResults({ scan }) {
  const [expandedHost, setExpandedHost] = useState(null);
  const [expandedPort, setExpandedPort] = useState(null);

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
                              <div className="space-y-2">
                                {port.cves.map((cve) => (
                                  <div key={cve.id} className={`rounded-[8px] px-3 py-2.5 ${severityStyle[cve.severity] || severityStyle.UNKNOWN}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="sx-micro-bold font-mono">{cve.id}</span>
                                      <div className="flex items-center gap-2">
                                        {cve.score && <span className="sx-micro font-bold">{cve.score}</span>}
                                        <span className="sx-micro">{cve.severity}</span>
                                      </div>
                                    </div>
                                    <p className="sx-micro mt-1 opacity-80 line-clamp-2">{cve.description}</p>
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
