'use client';

import { useEffect } from 'react';

export default function SavePrompt({ hasChanges, onSave, onDiscard }) {
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  if (!hasChanges) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-alt border border-border rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
      <span className="text-sm text-text-secondary">You have unsaved changes</span>
      <button
        onClick={onDiscard}
        className="text-sm px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-hover transition-colors"
      >
        Discard
      </button>
      <button
        onClick={onSave}
        className="text-sm px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
}
