'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FsNode, OpenedFolder } from '@/types';
import { FileTree } from './FileTree';
import { getApi, hasApi } from '@/lib/electron-api';
import { filterTree, pruneToMarkdown } from '@/lib/filter';
import { useAutoHideMenu } from '@/lib/useAutoHideMenu';
import { ChevronDown, ChevronRight, Clipboard, RefreshCw, X } from 'lucide-react';

type Props = {
  folder: OpenedFolder;
  activeFile: { folderId: string; relativePath: string } | null;
  onPickFile: (folderId: string, relativePath: string) => void;
  onClose: (folderId: string) => void;
  onCopyFolderPath?: (hostPath: string) => void;
  onDropFolderOnTerminal?: (hostPath: string) => void;
  filter?: string;
  flashRelativePath?: string | null;
  markdownOnly?: boolean;
  /** Settings → Behavior: context menus close shortly after the mouse leaves. */
  menuAutoHide?: boolean;
};

const DRAG_THRESHOLD_PX = 24;

/** Compact signature of a tree's structure so we can skip no-op refreshes. */
function treeSig(node: FsNode | null): string {
  if (!node) return '';
  const parts: string[] = [];
  const walk = (n: FsNode) => {
    parts.push(`${n.type}:${n.relativePath}`);
    n.children?.forEach(walk);
  };
  walk(node);
  return parts.join('|');
}

export function FolderSection({
  folder,
  activeFile,
  onPickFile,
  onClose,
  onCopyFolderPath,
  onDropFolderOnTerminal,
  filter,
  flashRelativePath,
  markdownOnly,
  menuAutoHide,
}: Props) {
  const [tree, setTree] = useState<FsNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuHide = useAutoHideMenu(menuAutoHide ?? true, !!menu, () => setMenu(null));
  const sigRef = useRef('');

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  function startHeaderDrag(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
    if (folder.isVirtual) return; // Can't paste a virtual folder path
    if (!onDropFolderOnTerminal) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let armed = false;
    let last: MouseEvent | null = null;
    const onMove = (ev: MouseEvent) => {
      last = ev;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!armed && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      armed = true;
      setDragging(true);
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragging(false);
      const evt = last ?? ev;
      if (!armed) return;
      const el = document.elementFromPoint(evt.clientX, evt.clientY) as HTMLElement | null;
      if (el?.closest('[data-drop-zone="terminal"]')) {
        onDropFolderOnTerminal(folder.hostPath);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // `silent` (used by auto-refresh) skips the loading flash and only updates the
  // tree when its structure actually changed — so background file churn doesn't
  // cause constant visible refreshes.
  const loadTree = useCallback((silent = false) => {
    if (folder.isVirtual) {
      const t = folder.virtualTree ?? null;
      sigRef.current = treeSig(t);
      setTree(t);
      setLoading(false);
      setError(null);
      return;
    }
    if (!hasApi()) return;
    if (!silent) setLoading(true);
    setError(null);
    getApi().fs.tree(folder.hostPath)
      .then((d) => {
        const sig = treeSig(d);
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setTree(d);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => { if (!silent) setLoading(false); });
  }, [folder.hostPath, folder.isVirtual, folder.virtualTree]);

  useEffect(() => { loadTree(); }, [loadTree]);

  // Refresh when the window regains focus (cheap — no continuous filesystem
  // watching), throttled so rapid focus/blur doesn't rescan repeatedly. The
  // reload is silent + diff-based, so it's a no-op unless files actually changed.
  useEffect(() => {
    if (folder.isVirtual) return;
    let last = 0;
    const onFocus = () => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - last < 3000) return;
      last = now;
      loadTree(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [folder.isVirtual, loadTree]);

  const activePath = activeFile?.folderId === folder.id ? activeFile.relativePath : null;
  const tint = folder.color + '22';

  const base = markdownOnly && tree ? pruneToMarkdown(tree) : tree;
  const displayed = filter && base ? filterTree(base, filter) : base;
  if (filter && displayed === null) return null;

  return (
    <section className="mb-3">
      <div
        className={[
          'mb-1 flex select-none items-center gap-2 rounded-md px-2 py-1.5 font-semibold',
          folder.isVirtual ? '' : 'cursor-grab',
          dragging ? 'opacity-60' : '',
        ].join(' ')}
        style={{ background: tint }}
        onMouseDown={startHeaderDrag}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <button
          type="button"
          aria-label={collapsed ? `Expand folder ${folder.name}` : `Collapse folder ${folder.name}`}
          aria-expanded={!collapsed}
          onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
          className="flex-shrink-0 text-muted hover:text-fg"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        </button>
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: folder.color }} aria-hidden />
        <span className="flex-1 truncate text-fg">{folder.name}</span>
        {!folder.isVirtual && (
          <button
            type="button"
            aria-label={`Refresh folder ${folder.name}`}
            title="Refresh"
            onClick={(e) => { e.stopPropagation(); loadTree(); }}
            className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
          </button>
        )}
        <button
          type="button"
          aria-label={`Close folder ${folder.name}`}
          onClick={(e) => { e.stopPropagation(); onClose(folder.id); }}
          className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </div>
      {menu && (
        <div
          {...menuHide}
          className="panel-float fixed z-50 min-w-[180px] py-1 animate-[popIn_150ms_var(--ease)]"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onCopyFolderPath && !folder.isVirtual && (
            <button
              type="button"
              onClick={() => { onCopyFolderPath(folder.hostPath); setMenu(null); }}
              className="block w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-surface-2"
            >
              <Clipboard className="mr-1 inline h-3 w-3" aria-hidden /> Copy folder path
            </button>
          )}
          <button
            type="button"
            onClick={() => { onClose(folder.id); setMenu(null); }}
            className="block w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-surface-2"
          >
            Close folder
          </button>
        </div>
      )}
      {!collapsed && loading && <div className="px-2 text-xs text-muted">Loading…</div>}
      {!collapsed && error && <div className="px-2 text-xs text-red-600">{error}</div>}
      {!collapsed && displayed?.children && (
        <FileTree
          nodes={displayed.children}
          activePath={activePath}
          onPickFile={(rel) => onPickFile(folder.id, rel)}
          forceExpanded={!!filter}
          flashRelativePath={flashRelativePath}
        />
      )}
    </section>
  );
}
