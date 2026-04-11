'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  { key: 'DNS', label: 'DNS Lookups', color: 'bg-amber-500/10 text-amber-400' },
  { key: 'NMAP', label: 'Nmap Scans', color: 'bg-accent/10 text-link' },
  { key: 'BANNER', label: 'Banner Grabs', color: 'bg-emerald-500/10 text-emerald-400' },
  { key: 'CVE', label: 'CVE Lookups', color: 'bg-purple-500/10 text-purple-400' },
];

const LEVELS = [
  { key: 'ERROR', label: 'Error', color: 'text-danger' },
  { key: 'WARN', label: 'Warn', color: 'text-warning' },
  { key: 'INFO', label: 'Info', color: 'text-text-primary' },
  { key: 'DEBUG', label: 'Debug', color: 'text-text-tertiary' },
];

const levelBadge = {
  ERROR: 'bg-danger/10 text-danger',
  WARN: 'bg-warning/10 text-warning',
  INFO: 'bg-accent/10 text-link',
  DEBUG: 'bg-surface-hover text-text-tertiary',
};

const catBadge = {
  DNS: 'bg-amber-500/10 text-amber-400',
  NMAP: 'bg-accent/10 text-link',
  BANNER: 'bg-emerald-500/10 text-emerald-400',
  CVE: 'bg-purple-500/10 text-purple-400',
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState(new Set(['DNS', 'NMAP', 'BANNER', 'CVE']));
  const [selectedLevels, setSelectedLevels] = useState(new Set(['ERROR', 'WARN', 'INFO', 'DEBUG']));
  const [expandedLog, setExpandedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const cats = [...selectedCategories].join(',');
      const lvls = [...selectedLevels].join(',');
      const params = new URLSearchParams({ limit: '200' });
      if (cats) params.set('category', cats);
      if (lvls) params.set('level', lvls);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, selectedLevels]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  function toggleCategory(key) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleLevel(key) {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="sx-sub-heading text-text-primary">Activity Logs</h2>
          <p className="sx-caption text-text-secondary mt-1">Verbose logging for DNS lookups, nmap scans, banner grabs, and CVE queries</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="sx-caption px-3 py-1.5 rounded-[8px] border border-border text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`sx-pill sx-micro px-3 py-1 border transition-colors ${
              autoRefresh
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-text-secondary'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-alt rounded-[8px] p-4 mb-6 space-y-3">
        {/* Category filters */}
        <div>
          <p className="sx-micro-bold text-text-secondary mb-2">Filter by Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`sx-pill sx-micro px-3 py-1 border transition-colors ${
                  selectedCategories.has(cat.key)
                    ? `${cat.color} border-current`
                    : 'border-border text-text-tertiary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Level filters */}
        <div>
          <p className="sx-micro-bold text-text-secondary mb-2">Filter by Level</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.key}
                onClick={() => toggleLevel(lvl.key)}
                className={`sx-pill sx-micro px-3 py-1 border transition-colors ${
                  selectedLevels.has(lvl.key)
                    ? `${lvl.color} border-current`
                    : 'border-border text-text-tertiary'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        <p className="sx-micro text-text-tertiary">Showing {logs.length} of {total} entries</p>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="text-center py-16 sx-caption text-text-secondary">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-surface-alt rounded-[12px]">
          <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <p className="sx-body text-text-secondary mb-1">No log entries</p>
          <p className="sx-caption text-text-tertiary">Run a scan or resolve a domain to generate logs</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((entry) => {
            const isExpanded = expandedLog === entry.id;
            return (
              <div key={entry.id} className="bg-surface-alt rounded-[8px] overflow-hidden">
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : entry.id)}
                  className="w-full px-4 py-2.5 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="sx-micro text-text-tertiary font-mono w-[140px] shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()} {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    <span className={`sx-micro-bold px-1.5 py-0.5 rounded-[4px] w-[52px] text-center shrink-0 ${levelBadge[entry.level] || levelBadge.INFO}`}>
                      {entry.level}
                    </span>
                    <span className={`sx-micro px-1.5 py-0.5 rounded-[980px] shrink-0 ${catBadge[entry.category] || catBadge.NMAP}`}>
                      {entry.category}
                    </span>
                    <span className="sx-micro text-text-primary truncate">{entry.message}</span>
                    {entry.detail?.duration != null && (
                      <span className="sx-micro text-text-tertiary ml-auto shrink-0">{entry.detail.duration}ms</span>
                    )}
                    <svg
                      className={`w-3.5 h-3.5 text-text-tertiary transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && entry.detail && (
                  <div className="px-4 pb-3 border-t border-border">
                    <pre className="sx-micro font-mono text-text-secondary mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-surface rounded-[8px] border border-border p-3 max-h-[400px] overflow-y-auto">
                      {JSON.stringify(entry.detail, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
