'use client';

import { useState } from 'react';

const VALIDATORS = {
  ip: /^(\d{1,3}\.){3}\d{1,3}$/,
  cidr: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
  hostname: /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
  domain: /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
};

export default function AssetForm({ asset, onSave, onCancel }) {
  const [name, setName] = useState(asset?.name || '');
  const [target, setTarget] = useState(asset?.target || '');
  const [type, setType] = useState(asset?.type || 'ip');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!target.trim()) {
      setError('Target is required');
      return;
    }

    if (!VALIDATORS[type].test(target.trim())) {
      const hints = {
        ip: 'e.g. 192.168.1.10',
        cidr: 'e.g. 192.168.1.0/24',
        hostname: 'e.g. fileserver.corp.local',
        domain: 'e.g. example.com',
      };
      setError(`Invalid ${type} format — ${hints[type]}`);
      return;
    }

    onSave({ name: name.trim(), target: target.trim(), type });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-danger/10 text-danger rounded-[8px] px-4 py-3 sx-caption">
          {error}
        </div>
      )}

      <div>
        <label className="block sx-caption-bold text-text-secondary mb-1.5">Asset Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[8px] border border-border px-4 py-2.5 sx-caption bg-surface-5"
          placeholder="e.g. Production Web Server"
        />
      </div>

      <div>
        <label className="block sx-caption-bold text-text-secondary mb-1.5">Target Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-[8px] border border-border px-4 py-2.5 sx-caption bg-surface-5"
        >
          <option value="ip">Single IP</option>
          <option value="cidr">CIDR Range</option>
          <option value="hostname">Hostname</option>
          <option value="domain">Domain (dig/nslookup)</option>
        </select>
      </div>

      <div>
        <label className="block sx-caption-bold text-text-secondary mb-1.5">Target</label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full rounded-[8px] border border-border px-4 py-2.5 sx-caption bg-surface-5 font-mono"
          placeholder={
            type === 'ip' ? '192.168.1.10' :
            type === 'cidr' ? '192.168.1.0/24' :
            type === 'domain' ? 'example.com' :
            'fileserver.corp.local'
          }
        />
        {type === 'domain' && (
          <p className="sx-micro text-text-tertiary mt-1.5">Performs dig/nslookup to resolve A, CNAME, and MX records. All resolved hosts are added as assets automatically.</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 sx-caption rounded-[8px] border border-border text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 sx-caption rounded-[8px] bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          {asset ? 'Update Asset' : type === 'domain' ? 'Resolve & Add' : 'Add Asset'}
        </button>
      </div>
    </form>
  );
}
