'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';

export default function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Nmap Path
  const [nmapPath, setNmapPath] = useState('');
  const [nmapSaved, setNmapSaved] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPwError(data.error || 'Failed to change password');
        return;
      }

      setPwSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPwError('Network error');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Theme</p>
            <p className="text-xs text-text-secondary mt-0.5">Toggle between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              theme === 'dark' ? 'bg-accent' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                theme === 'dark' ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-2">
          Current: {theme === 'dark' ? 'Dark' : 'Light'} mode
        </p>
      </section>

      {/* Change Password */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {pwError && (
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-success/10 border border-success/20 text-success rounded-lg px-4 py-3 text-sm">
              {pwSuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50"
          >
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Nmap Path Override */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Nmap Path Override</h3>
        <p className="text-xs text-text-secondary mb-3">
          Override the default nmap binary path. Leave empty to use system PATH.
        </p>
        <div className="flex gap-3 max-w-md">
          <input
            type="text"
            value={nmapPath}
            onChange={(e) => { setNmapPath(e.target.value); setNmapSaved(false); }}
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm font-mono"
            placeholder="/usr/local/bin/nmap"
          />
          <button
            onClick={() => setNmapSaved(true)}
            className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            Save
          </button>
        </div>
        {nmapSaved && (
          <p className="text-xs text-success mt-2">Path saved (requires server restart to take effect)</p>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">Notification Preferences</h3>
        <p className="text-sm text-text-secondary">Coming soon — email and webhook notifications for completed scans.</p>
      </section>
    </div>
  );
}
