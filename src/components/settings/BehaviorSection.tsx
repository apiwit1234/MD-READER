'use client';
import type { AppSettings } from '@/lib/electron-api';
import { applyZoomStep, ZOOM_MAX, ZOOM_MIN } from '@/lib/zoom';

type Props = {
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
};

export function BehaviorSection({ settings, onUpdateSettings }: Props) {
  const zoom = settings?.contentZoom ?? 100;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Context menus</div>
      <label className="flex items-center justify-between rounded-theme border border-border p-2.5 text-sm">
        <span>
          Auto-hide context menus
          <span className="block text-xs text-muted">Right-click menus close when the mouse leaves them</span>
        </span>
        <input
          type="checkbox"
          aria-label="Auto-hide context menus"
          checked={settings?.contextMenuAutoHide ?? true}
          disabled={!settings}
          onChange={(e) => onUpdateSettings({ contextMenuAutoHide: e.target.checked })}
        />
      </label>

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Content zoom</div>
      <div className="flex items-center justify-between rounded-theme border border-border p-2.5 text-sm">
        <span>
          Reading text size
          <span className="block text-xs text-muted">Also: Ctrl+scroll over content, Ctrl+= / Ctrl+- / Ctrl+0</span>
        </span>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={!settings || zoom <= ZOOM_MIN}
            onClick={() => onUpdateSettings({ contentZoom: applyZoomStep(zoom, -1) })}
            className="rounded-theme border border-border px-2 py-0.5 text-xs hover:bg-surface-2 disabled:opacity-40"
          >
            −
          </button>
          <span className="w-12 text-center font-mono text-xs">{zoom}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={!settings || zoom >= ZOOM_MAX}
            onClick={() => onUpdateSettings({ contentZoom: applyZoomStep(zoom, 1) })}
            className="rounded-theme border border-border px-2 py-0.5 text-xs hover:bg-surface-2 disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            disabled={!settings || zoom === 100}
            onClick={() => onUpdateSettings({ contentZoom: 100 })}
            className="rounded-theme border border-border px-2 py-0.5 text-xs hover:bg-surface-2 disabled:opacity-40"
          >
            Reset
          </button>
        </span>
      </div>
    </div>
  );
}
