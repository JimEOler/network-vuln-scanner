'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import ScheduleForm from '@/components/ScheduleForm';

export default function SchedulingPage() {
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/schedules').then((r) => r.json()),
      fetch('/api/assets').then((r) => r.json()),
    ]).then(([sched, ast]) => {
      setSchedules(sched);
      setAssets(ast);
      setLoading(false);
    });
  }, []);

  async function handleSave(data) {
    try {
      if (editSchedule) {
        const res = await fetch(`/api/schedules/${editSchedule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setSchedules((prev) => prev.map((s) => (s.id === editSchedule.id ? updated : s)));
        }
      } else {
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          setSchedules((prev) => [...prev, created]);
        }
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
    setShowForm(false);
    setEditSchedule(null);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(`/api/schedules/${deleteId}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((s) => s.id !== deleteId));
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
    setDeleteId(null);
  }

  async function toggleEnabled(schedule) {
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedule.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  }

  async function runNow(schedule) {
    try {
      await fetch('/api/scans/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id, assetIds: schedule.assetIds }),
      });
      alert('Scan started! Check Scan Results tab for progress.');
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    }
  }

  function getAssetNames(assetIds) {
    return assetIds
      .map((id) => assets.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Scheduling</h2>
          <p className="text-sm text-text-secondary mt-1">Configure recurring or one-time scan schedules</p>
        </div>
        <button
          onClick={() => { setEditSchedule(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Schedule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 bg-surface-alt rounded-xl border border-border">
          <svg className="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-secondary mb-2">No schedules configured</p>
          <p className="text-sm text-text-secondary">Create a schedule to automate vulnerability scanning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-surface-alt rounded-xl border border-border px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleEnabled(schedule)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      schedule.enabled ? 'bg-accent' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        schedule.enabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">{schedule.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-secondary font-mono">
                        {schedule.oneTime ? 'One-time' : schedule.cronExpression}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {getAssetNames(schedule.assetIds)}
                      </span>
                    </div>
                    {schedule.nextRun && (
                      <p className="text-xs text-text-secondary mt-1">
                        Next run: {new Date(schedule.nextRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runNow(schedule)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                    title="Run now"
                  >
                    Run Now
                  </button>
                  <button
                    onClick={() => { setEditSchedule(schedule); setShowForm(true); }}
                    className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(schedule.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditSchedule(null); }}
        title={editSchedule ? 'Edit Schedule' : 'New Schedule'}
      >
        <ScheduleForm
          assets={assets}
          schedule={editSchedule}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditSchedule(null); }}
        />
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Schedule"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete this schedule? This action cannot be undone.
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
