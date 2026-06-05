'use client';
import { useState } from 'react';
import { getApi, hasApi } from '@/lib/electron-api';

type Props = {
  onResetDefaults: () => void;
};

export function AdvancedSection({ onResetDefaults }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Diagnostics</div>
      <div className="flex items-center justify-between rounded-theme border border-border p-2.5 text-sm">
        <span className="text-muted">Error logs — one file per error; send them when reporting a bug</span>
        <button
          type="button"
          disabled={!hasApi()}
          onClick={() => { if (hasApi()) void getApi().app.openLog(); }}
          className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2 disabled:opacity-40"
        >
          Open logs folder
        </button>
      </div>

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Reset</div>
      <div className="flex items-center justify-between rounded-theme border border-border p-2.5 text-sm">
        <span className="text-muted">
          Restore every setting to factory defaults.
          <span className="block text-xs">Folders, tabs and uploaded font files are kept.</span>
        </span>
        {confirming ? (
          <span className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => { setConfirming(false); onResetDefaults(); }}
              className="rounded-theme border border-rose-400 px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              Confirm reset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2"
          >
            Reset to defaults
          </button>
        )}
      </div>
    </div>
  );
}
