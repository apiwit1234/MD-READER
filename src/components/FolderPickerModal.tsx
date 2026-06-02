'use client';
import { useEffect, useState } from 'react';
import type { BrowseResponse, RecentFolder } from '@/types';
import { getApi } from '@/lib/electron-api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPick: (hostPath: string) => void;
  recentFolders: RecentFolder[];
};

export function FolderPickerModal({ isOpen, onClose, onPick, recentFolders }: Props) {
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize to home dir on first open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getApi().fs.homeDir().then((home) => { if (!cancelled) setPath(home); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getApi().fs.browse(path)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, path]);

  async function nativePickAndUse() {
    const picked = await getApi().fs.pickDirectory();
    if (picked) onPick(picked);
  }

  if (!isOpen) return null;

  const joinPath = (parent: string, name: string) => {
    if (parent.endsWith('\\') || parent.endsWith('/')) return parent + name;
    const sep = parent.includes('\\') ? '\\' : '/';
    return parent + sep + name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Open folder"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-surface text-fg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-lg font-semibold">Open folder</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={nativePickAndUse}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-2"
            >
              Native picker…
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-surface-2">✕</button>
          </div>
        </div>

        {recentFolders.length > 0 && (
          <div className="border-b border-border px-5 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Recent</div>
            <ul className="text-sm">
              {recentFolders.slice(0, 5).map((r) => (
                <li key={r.hostPath}>
                  <button
                    className="w-full rounded px-2 py-1 text-left hover:bg-surface-2"
                    onClick={() => onPick(r.hostPath)}
                  >
                    {r.hostPath}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-b border-border px-5 py-2 text-sm">
          {data?.breadcrumbs.map((b, i) => (
            <span key={b.path}>
              {i > 0 && <span className="px-1 text-muted">/</span>}
              <button className="text-accent hover:underline" onClick={() => setPath(b.path)}>
                {b.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && <div className="text-sm text-muted">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && data && data.entries.length === 0 && (
            <div className="text-sm text-muted">No subfolders here.</div>
          )}
          <ul className="space-y-1">
            {data?.entries.map((e) => (
              <li key={e.name}>
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-surface-2"
                  onClick={() => setPath(joinPath(data.currentPath, e.name))}
                >
                  <span aria-hidden>📁</span>
                  <span>{e.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="truncate text-xs text-muted">{data?.currentPath}</span>
          <button
            type="button"
            onClick={() => data && onPick(data.currentPath)}
            disabled={!data}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open this folder
          </button>
        </div>
      </div>
    </div>
  );
}
