'use client';
import { useState } from 'react';
import { getApi, hasApi, type AppSettings } from '@/lib/electron-api';

type Props = {
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
};

export function UpdatesSection({ settings, onUpdateSettings }: Props) {
  const [checkResult, setCheckResult] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Updates</div>
      <div className="rounded-theme border border-border p-2.5 text-sm">
        <label className="flex items-center justify-between gap-2">
          <span>Automatic updates</span>
          <input
            type="checkbox"
            aria-label="Automatic updates"
            checked={settings?.autoUpdate ?? true}
            disabled={!hasApi() || !settings}
            onChange={(e) => onUpdateSettings({ autoUpdate: e.target.checked })}
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted">
            {checkResult ?? 'Updates download in the background and install when you restart.'}
          </span>
          <button
            type="button"
            disabled={!hasApi()}
            onClick={() => {
              setCheckResult('Checking…');
              void getApi().update.check().then((r) => {
                if (!r.ok) setCheckResult(r.error ?? 'Check failed');
                else if (r.version) setCheckResult(`Update v${r.version} found — downloading in background`);
                else setCheckResult('You are up to date');
              });
            }}
            className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2 disabled:opacity-40"
          >
            Check for updates
          </button>
        </div>
      </div>
    </div>
  );
}
