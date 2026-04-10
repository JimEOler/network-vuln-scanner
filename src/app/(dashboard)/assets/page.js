'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import AssetForm from '@/components/AssetForm';

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data) {
    try {
      if (editAsset) {
        const res = await fetch(`/api/assets/${editAsset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setAssets((prev) => prev.map((a) => (a.id === editAsset.id ? updated : a)));
        }
      } else if (data.type === 'domain') {
        // Domain type: resolve via dig/nslookup and auto-create IP assets
        setShowForm(false);
        setResolving(true);
        const res = await fetch('/api/assets/resolve-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, target: data.target }),
        });
        const result = await res.json();
        setResolving(false);
        if (res.ok) {
          setAssets((prev) => [...prev, ...result.createdAssets]);
          setResolveResult(result);
        } else {
          setResolveResult({ error: result.error });
        }
        return;
      } else {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          setAssets((prev) => [...prev, created]);
        }
      }
    } catch (err) {
      console.error('Failed to save asset:', err);
      setResolving(false);
    }
    setShowForm(false);
    setEditAsset(null);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(`/api/assets/${deleteId}`, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== deleteId));
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
    setDeleteId(null);
  }

  const typeColors = {
    ip: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cidr: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    hostname: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    domain: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Assets</h2>
          <p className="text-sm text-text-secondary mt-1">Define scan targets — IPs, CIDR ranges, hostnames, or domains</p>
        </div>
        <button
          onClick={() => { setEditAsset(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Asset
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-surface-alt rounded-xl border border-border">
          <svg className="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-text-secondary mb-2">No assets defined yet</p>
          <p className="text-sm text-text-secondary">Add your first scan target to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between bg-surface-alt rounded-xl border border-border px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-text-primary">{asset.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[asset.type]}`}>
                      {asset.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1 font-mono">{asset.target}</p>
                  {asset.resolvedRecords && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {asset.resolvedRecords.a?.length || 0} A, {asset.resolvedRecords.cname?.length || 0} CNAME, {asset.resolvedRecords.mx?.length || 0} MX — via {asset.resolvedWith}
                    </p>
                  )}
                  {asset.recordType && (
                    <span className="text-xs text-text-secondary mt-0.5">
                      {asset.recordType} record
                    </span>
                  )}
                  {asset.parentDomainId && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      from domain lookup
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditAsset(asset); setShowForm(true); }}
                  className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteId(asset.id)}
                  className="p-2 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditAsset(null); }}
        title={editAsset ? 'Edit Asset' : 'Add Asset'}
      >
        <AssetForm
          asset={editAsset}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditAsset(null); }}
        />
      </Modal>

      {/* Resolving Indicator */}
      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-alt border border-border rounded-xl px-8 py-6 text-center">
            <svg className="w-8 h-8 mx-auto text-accent animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-text-primary font-medium">Resolving domain...</p>
            <p className="text-xs text-text-secondary mt-1">Running dig / nslookup lookup</p>
          </div>
        </div>
      )}

      {/* Domain Resolution Results */}
      <Modal
        open={!!resolveResult}
        onClose={() => setResolveResult(null)}
        title={resolveResult?.error ? 'Resolution Failed' : 'Domain Resolved'}
      >
        {resolveResult?.error ? (
          <div className="space-y-4">
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
              {resolveResult.error}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setResolveResult(null)}
                className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        ) : resolveResult ? (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 text-success rounded-lg px-4 py-3 text-sm">
              Resolved <span className="font-mono font-medium">{resolveResult.domain?.target}</span> using{' '}
              <span className="font-medium">{resolveResult.resolvedWith}</span>
            </div>

            {resolveResult.records?.a?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">
                  A Records ({resolveResult.records.a.length})
                </p>
                <div className="space-y-1.5">
                  {resolveResult.records.a.map((ip) => (
                    <div key={ip} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm font-mono text-text-primary">{ip}</span>
                      <span className="text-xs text-text-secondary ml-auto">IP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolveResult.records?.cname?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">
                  CNAME Records ({resolveResult.records.cname.length})
                </p>
                <div className="space-y-1.5">
                  {resolveResult.records.cname.map((host) => (
                    <div key={host} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-mono text-text-primary">{host}</span>
                      <span className="text-xs text-text-secondary ml-auto">Hostname</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolveResult.records?.mx?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">
                  MX Records ({resolveResult.records.mx.length})
                </p>
                <div className="space-y-1.5">
                  {resolveResult.records.mx.map((host) => (
                    <div key={host} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm font-mono text-text-primary">{host}</span>
                      <span className="text-xs text-text-secondary ml-auto">Hostname</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-text-secondary">
              {resolveResult.createdAssets?.length} total assets created
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setResolveResult(null)}
                className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Asset"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete this asset? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm rounded-lg bg-danger hover:bg-danger-hover text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
