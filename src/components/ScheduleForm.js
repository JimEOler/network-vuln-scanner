'use client';

import { useState } from 'react';

const PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0' },
  { label: 'Monthly (1st at midnight)', value: '0 0 1 * *' },
];

export default function ScheduleForm({ assets, schedule, onSave, onCancel }) {
  const [name, setName] = useState(schedule?.name || '');
  const [selectedAssets, setSelectedAssets] = useState(schedule?.assetIds || []);
  const [scheduleType, setScheduleType] = useState(schedule?.oneTime ? 'oneTime' : 'recurring');
  const [cronExpression, setCronExpression] = useState(schedule?.cronExpression || '0 0 * * *');
  const [error, setError] = useState('');

  function toggleAsset(id) {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Schedule name is required');
      return;
    }

    if (selectedAssets.length === 0) {
      setError('Select at least one asset');
      return;
    }

    onSave({
      name: name.trim(),
      assetIds: selectedAssets,
      cronExpression: scheduleType === 'recurring' ? cronExpression : null,
      oneTime: scheduleType === 'oneTime',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Schedule Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2.5 text-sm"
          placeholder="e.g. Weekly Production Scan"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Select Assets</label>
        {assets.length === 0 ? (
          <p className="text-sm text-text-secondary">No assets available — create one first</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {assets.map((asset) => (
              <label
                key={asset.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedAssets.includes(asset.id)
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:bg-surface-hover'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={() => toggleAsset(asset.id)}
                  className="rounded"
                />
                <div>
                  <span className="text-sm text-text-primary">{asset.name}</span>
                  <span className="text-xs text-text-secondary ml-2 font-mono">{asset.target}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Schedule Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setScheduleType('recurring')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              scheduleType === 'recurring'
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            Recurring
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('oneTime')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              scheduleType === 'oneTime'
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            One-Time
          </button>
        </div>
      </div>

      {scheduleType === 'recurring' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Cron Expression</label>
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm font-mono"
            placeholder="0 0 * * *"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setCronExpression(preset.value)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  cronExpression === preset.value
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          {schedule ? 'Update Schedule' : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}
