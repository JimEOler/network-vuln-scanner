import SettingsPanel from '@/components/SettingsPanel';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="sx-sub-heading text-text-primary">Settings</h2>
        <p className="sx-caption text-text-secondary mt-1">Manage your account and application preferences</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
