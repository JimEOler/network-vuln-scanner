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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-alt rounded-[12px] sx-shadow px-6 py-3 flex items-center gap-4 border border-border">
      <span className="sx-caption text-text-secondary">You have unsaved changes</span>
      <button
        onClick={onDiscard}
        className="sx-caption px-3 py-1.5 rounded-[8px] border border-border text-text-secondary hover:bg-surface-hover transition-colors"
      >
        Discard
      </button>
      <button
        onClick={onSave}
        className="sx-caption px-3 py-1.5 rounded-[8px] bg-accent hover:bg-accent-hover text-white transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
}
