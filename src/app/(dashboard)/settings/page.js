import SettingsPanel from '@/components/SettingsPanel';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
        <p className="text-sm text-text-secondary mt-1">Manage your account and application preferences</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
