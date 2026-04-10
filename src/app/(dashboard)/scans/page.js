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
    const interval = setInterval(fetchScans, 10000);
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

  const statusStyle = {
    running: 'bg-accent/10 text-accent',
    completed: 'bg-success/10 text-success',
    failed: 'bg-danger/10 text-danger',
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="sx-sub-heading text-text-primary">Scan Results</h2>
        <p className="sx-caption text-text-secondary mt-1">View completed and in-progress vulnerability scans</p>
      </div>

      {selectedScan && scanDetail ? (
        <div>
          <button
            onClick={() => { setSelectedScan(null); setScanDetail(null); }}
            className="flex items-center gap-2 sx-caption text-link hover:underline mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to scan list
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className={`sx-micro px-2 py-0.5 rounded-[980px] ${statusStyle[scanDetail.status]}`}>
              {scanDetail.status}
            </span>
            <span className="sx-caption text-text-secondary">
              {new Date(scanDetail.startedAt).toLocaleString()}
            </span>
            {scanDetail.completedAt && (
              <span className="sx-micro text-text-tertiary">
                Duration: {Math.round((new Date(scanDetail.completedAt) - new Date(scanDetail.startedAt)) / 1000)}s
              </span>
            )}
          </div>

          <ScanResults scan={scanDetail} />
        </div>
      ) : loading ? (
        <div className="text-center py-16 sx-caption text-text-secondary">Loading scans...</div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20 bg-surface-alt rounded-[12px]">
          <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="sx-body text-text-secondary mb-1">No scan results yet</p>
          <p className="sx-caption text-text-tertiary">Run a scan from the Scheduling tab to see results here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => viewScan(scan.id)}
              className="w-full bg-surface-alt rounded-[8px] px-5 py-4 hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`sx-micro px-2 py-0.5 rounded-[980px] ${statusStyle[scan.status]}`}>
                    {scan.status}
                  </span>
                  <span className="sx-caption text-text-primary">
                    {new Date(scan.startedAt).toLocaleString()}
                  </span>
                  {scan.triggeredBy && (
                    <span className="sx-micro text-text-tertiary">by {scan.triggeredBy}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 sx-micro text-text-secondary">
                  <span>{scan.summary?.totalHosts || 0} hosts</span>
                  <span>{scan.summary?.totalPorts || 0} ports</span>
                  {scan.summary?.totalCVEs > 0 && (
                    <span className="text-danger font-semibold">{scan.summary.totalCVEs} CVEs</span>
                  )}
                  <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
