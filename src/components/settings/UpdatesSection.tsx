'use client';
import { useEffect, useState } from 'react';
import { getApi, hasApi, type AppSettings } from '@/lib/electron-api';

type Props = {
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
};

type Phase =
  | { step: 'idle'; note?: string }
  | { step: 'checking' }
  | { step: 'available'; version: string }
  | { step: 'downloading'; version: string; percent: number }
  | { step: 'ready'; version: string }
  | { step: 'error'; message: string };

export function UpdatesSection({ settings, onUpdateSettings }: Props) {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });

  // Background auto-update flow can finish while this pane is open.
  useEffect(() => {
    if (!hasApi()) return;
    const offProgress = getApi().update.onProgress((percent) =>
      setPhase((p) => (p.step === 'downloading' ? { ...p, percent } : p)),
    );
    const offReady = getApi().update.onUpdateReady((version) => setPhase({ step: 'ready', version }));
    return () => { offProgress(); offReady(); };
  }, []);

  const check = () => {
    setPhase({ step: 'checking' });
    void getApi().update.check().then((r) => {
      if (!r.ok) setPhase({ step: 'error', message: r.error ?? 'Check failed' });
      else if (r.version) setPhase({ step: 'available', version: r.version });
      else setPhase({ step: 'idle', note: 'You are up to date' });
    });
  };

  const download = (version: string) => {
    setPhase({ step: 'downloading', version, percent: 0 });
    void getApi().update.download().then((r) => {
      if (!r.ok) setPhase({ step: 'error', message: r.error ?? 'Download failed' });
      else setPhase({ step: 'ready', version });
    });
  };

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
            {phase.step === 'idle' && (phase.note ?? 'Updates download as small patches and apply on restart.')}
            {phase.step === 'checking' && 'Checking…'}
            {phase.step === 'available' && `v${phase.version} available`}
            {phase.step === 'downloading' && `Downloading v${phase.version}… ${Math.round(phase.percent)}%`}
            {phase.step === 'ready' && `v${phase.version} ready — restart to apply`}
            {phase.step === 'error' && <span className="text-danger">{phase.message}</span>}
          </span>

          {phase.step === 'available' ? (
            <button
              type="button"
              onClick={() => download(phase.version)}
              className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2"
            >
              Download
            </button>
          ) : phase.step === 'ready' ? (
            <button
              type="button"
              onClick={() => void getApi().update.install()}
              className="btn-gradient shrink-0 rounded-theme px-2 py-1 text-xs"
            >
              Restart &amp; Update
            </button>
          ) : (
            <button
              type="button"
              disabled={!hasApi() || phase.step === 'checking' || phase.step === 'downloading'}
              onClick={check}
              className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2 disabled:opacity-40"
            >
              Check for updates
            </button>
          )}
        </div>

        {phase.step === 'downloading' && (
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(phase.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width]"
              style={{ width: `${phase.percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
