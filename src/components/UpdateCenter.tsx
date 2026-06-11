'use client';
import { useEffect, useState } from 'react';
import { getApi, hasApi } from '@/lib/electron-api';
import { requestUpdateRestart, UPDATE_RESTARTING_EVENT } from '@/lib/update-restart';

type CenterState =
  | { step: 'hidden' }
  | { step: 'available'; version: string; error?: string }
  | { step: 'downloading'; version: string; percent: number }
  | { step: 'restarting'; version: string };

/**
 * Bottom-right update card. The launch check only ANNOUNCES an update — this
 * card asks the user, downloads on "Update now" (with progress), then shows a
 * "don't shut down your computer" notice while the app restarts itself.
 * Also listens for restarts triggered from Settings → Updates.
 */
export function UpdateCenter() {
  const [state, setState] = useState<CenterState>({ step: 'hidden' });

  useEffect(() => {
    if (!hasApi()) return;
    const offAvailable = getApi().update.onUpdateAvailable((version) =>
      setState((s) => (s.step === 'hidden' ? { step: 'available', version } : s)),
    );
    const offProgress = getApi().update.onProgress((percent) =>
      setState((s) => (s.step === 'downloading' ? { ...s, percent } : s)),
    );
    const onRestarting = (e: Event) =>
      setState({ step: 'restarting', version: String((e as CustomEvent).detail ?? '') });
    window.addEventListener(UPDATE_RESTARTING_EVENT, onRestarting);
    return () => {
      offAvailable();
      offProgress();
      window.removeEventListener(UPDATE_RESTARTING_EVENT, onRestarting);
    };
  }, []);

  if (state.step === 'hidden') return null;

  const updateNow = () => {
    if (state.step !== 'available') return;
    const version = state.version;
    setState({ step: 'downloading', version, percent: 0 });
    void getApi().update.download().then((r) => {
      if (!r.ok) {
        setState({ step: 'available', version, error: r.error ?? 'Download failed' });
        return;
      }
      setState({ step: 'restarting', version });
      requestUpdateRestart(version);
    });
  };

  return (
    <div
      role="status"
      className="panel-float fixed bottom-4 right-4 z-[90] w-80 p-3 text-sm text-fg animate-[popIn_180ms_var(--ease)]"
    >
      {state.step === 'available' && (
        <>
          <div className="font-semibold">Update v{state.version} available</div>
          <p className="mt-1 text-xs text-muted">
            A new version of PAX Reader is ready — it downloads as a small patch.
          </p>
          {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
          <div className="mt-2.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setState({ step: 'hidden' })}
              className="rounded-theme-sm px-2.5 py-1 text-xs text-muted hover:bg-surface-2"
            >
              Close
            </button>
            <button
              type="button"
              onClick={updateNow}
              className="btn-gradient rounded-theme-sm px-2.5 py-1 text-xs font-medium"
            >
              Update now
            </button>
          </div>
        </>
      )}

      {state.step === 'downloading' && (
        <>
          <div className="font-semibold">
            Downloading v{state.version}… {Math.round(state.percent)}%
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(state.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width]"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </>
      )}

      {state.step === 'restarting' && (
        <>
          <div className="font-semibold">Installing update{state.version ? ` v${state.version}` : ''}…</div>
          <p className="mt-1 text-xs text-muted">
            PAX Reader will close and reopen by itself in a few seconds. Please
            don&apos;t shut down your computer until it restarts.
          </p>
        </>
      )}
    </div>
  );
}
