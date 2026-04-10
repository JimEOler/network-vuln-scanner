'use client';

import { useState, useEffect } from 'react';
import ScanResults from '@/components/ScanResults';

export default function ScansPage() {
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [scanDetail, setScanDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  async function fetchScans() {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      setScans(data);
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function viewScan(scanId) {
    setSelectedScan(scanId);
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      const data = await res.json();
      setScanDetail(data);
    } catch (err) {
      console.error('Failed to fetch scan detail:', err);
    }
  }

  const statusColors = {
    running: 'bg-accent/10 text-accent border-accent/20',
    completed: 'bg-success/10 text-success border-success/20',
    failed: 'bg-danger/10 text-danger border-danger/20',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Scan Results</h2>
        <p className="text-sm text-text-secondary mt-1">View completed and in-progress vulnerability scans</p>
      </div>

      {selectedScan && scanDetail ? (
        <div>
          <button
            onClick={() => { setSelectedScan(null); setScanDetail(null); }}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to scan list
          </button>

          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[scanDetail.status]}`}>
                {scanDetail.status}
              </span>
              <span className="text-sm text-text-secondary">
                {new Date(scanDetail.startedAt).toLocaleString()}
              </span>
              {scanDetail.completedAt && (
                <span className="text-xs text-text-secondary">
                  Duration: {Math.round((new Date(scanDetail.completedAt) - new Date(scanDetail.startedAt)) / 1000)}s
                </span>
              )}
            </div>
          </div>

          <ScanResults scan={scanDetail} />
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-text-secondary">Loading scans...</div>
      ) : scans.length === 0 ? (
        <div className="text-center py-16 bg-surface-alt rounded-xl border border-border">
          <svg className="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary mb-2">No scan results yet</p>
          <p className="text-sm text-text-secondary">Run a scan from the Scheduling tab to see results here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => viewScan(scan.id)}
              className="w-full bg-surface-alt rounded-xl border border-border px-5 py-4 hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[scan.status]}`}>
                    {scan.status}
                  </span>
                  <span className="text-sm text-text-primary">
                    {new Date(scan.startedAt).toLocaleString()}
                  </span>
                  {scan.triggeredBy && (
                    <span className="text-xs text-text-secondary">by {scan.triggeredBy}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span>{scan.summary?.totalHosts || 0} hosts</span>
                  <span>{scan.summary?.totalPorts || 0} ports</span>
                  {scan.summary?.totalCVEs > 0 && (
                    <span className="text-danger font-medium">{scan.summary.totalCVEs} CVEs</span>
                  )}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
