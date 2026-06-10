'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';
import type { OpenedFolder } from '@/types';
import { FolderSection } from './FolderSection';
import { SidebarFilter } from './SidebarFilter';
import { filterTree } from '@/lib/filter';
import { subscribeReveal } from '@/lib/sidebar-events';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import {
  getDroppedEntries,
  processDroppedEntry,
  processDroppedFiles,
  type DropProgress,
  type DropResult,
} from '@/lib/drop';

type Props = {
  folders: OpenedFolder[];
  activeFile: { folderId: string; relativePath: string } | null;
  markdownOnly?: boolean;
  gitPanel?: ReactNode;
  /** Toggle chip state — drives animated collapse/expand of the git split.
   *  The Panel stays mounted so the global [data-panel] flex transition runs. */
  gitVisible?: boolean;
  /** Drag-collapse/expand of the internal git split (so the Git toggle stays in sync). */
  onGitVisibilityChange?: (visible: boolean) => void;
  onPickFile: (folderId: string, relativePath: string) => void;
  onCloseFolder: (folderId: string) => void;
  onOpenFolderClick: () => void;
  onDropFolder: (result: DropResult) => void;
  onCopyFolderPath?: (hostPath: string) => void;
  onDropFolderOnTerminal?: (hostPath: string) => void;
  /** Settings → Behavior: context menus close shortly after the mouse leaves. */
  menuAutoHide?: boolean;
};

export function Sidebar({
  folders,
  activeFile,
  markdownOnly,
  gitPanel,
  gitVisible,
  onGitVisibilityChange,
  onPickFile,
  onCloseFolder,
  onOpenFolderClick,
  onDropFolder,
  onCopyFolderPath,
  onDropFolderOnTerminal,
  menuAutoHide,
}: Props) {
  const [filter, setFilter] = useState('');
  const [dragOver, setDragOver] = useState(false);
  // Collapse the big "Open folder" block once folders are open to save space.
  const [openBlockCollapsed, setOpenBlockCollapsed] = useState(false);
  const hadFoldersRef = useRef(false);
  useEffect(() => {
    const has = folders.length > 0;
    if (has && !hadFoldersRef.current) setOpenBlockCollapsed(true);
    if (!has) setOpenBlockCollapsed(false);
    hadFoldersRef.current = has;
  }, [folders.length]);
  const [progress, setProgress] = useState<DropProgress | null>(null);
  const [flashing, setFlashing] = useState<{ folderId: string; relativePath: string } | null>(null);

  // Git split: when it (re)mounts, the persisted layout may hold a drag-collapsed
  // ~0 size — force it open at the default. The ready flag swallows the collapse
  // events the layout restore fires during mount, so only real user drags reach
  // onGitVisibilityChange.
  const gitPanelRef = useRef<ImperativePanelHandle | null>(null);
  const gitReadyRef = useRef(false);
  const hasGitPanel = Boolean(gitPanel);
  useEffect(() => {
    if (!hasGitPanel) {
      gitReadyRef.current = false;
      return;
    }
    const p = gitPanelRef.current;
    if (p) {
      if (gitVisible) {
        p.expand();
        if (p.getSize() < 10) p.resize(30);
      } else {
        p.collapse();
      }
    }
    gitReadyRef.current = true;
    // Mount-only by design — the toggle effect below reacts to gitVisible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGitPanel]);

  // Animated open/close from the Git toggle chip. The Panel stays mounted so
  // the global [data-panel] flex transition (globals.css) can animate it.
  useEffect(() => {
    if (!hasGitPanel) return;
    const p = gitPanelRef.current;
    if (!p) return;
    if (gitVisible) {
      p.expand();
      if (p.getSize() < 10) p.resize(30);
    } else {
      p.collapse();
    }
  }, [gitVisible, hasGitPanel]);

  useEffect(() => {
    return subscribeReveal(({ folderId, relativePath }) => {
      setFlashing({ folderId, relativePath });
      const t = setTimeout(() => setFlashing(null), 1500);
      return () => clearTimeout(t);
    });
  }, []);

  const filteredHasAny = useMemo(() => {
    if (!filter) return true;
    return folders.some((f) => {
      if (f.virtualTree) {
        return filterTree(f.virtualTree, filter) !== null;
      }
      // Non-virtual folders: tree is loaded async; assume matches to avoid false negatives.
      return true;
    });
  }, [folders, filter]);

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const entries = getDroppedEntries(e.dataTransfer);
    if (entries.length === 0) return;
    setProgress({ filesScanned: 0, mdFilesRead: 0, lastPath: '' });
    try {
      const folderEntries = entries.filter((x) => x.isDirectory);
      const fileEntries = entries.filter((x) => x.isFile);
      for (const folder of folderEntries) {
        const result = await processDroppedEntry(folder, setProgress);
        if (result.tree.children && result.tree.children.length > 0) {
          onDropFolder(result);
        }
      }
      if (fileEntries.length > 0) {
        const result = await processDroppedFiles(fileEntries, setProgress);
        if (result.tree.children && result.tree.children.length > 0) {
          onDropFolder(result);
        }
      }
    } finally {
      setProgress(null);
    }
  }

  return (
    <aside
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={handleDrop}
      className={[
        'relative flex h-full w-full flex-col border-r bg-surface',
        dragOver
          ? 'border-accent ring-2 ring-inset ring-accent/60'
          : 'border-border',
      ].join(' ')}
    >
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOpenBlockCollapsed((c) => !c)}
            className="flex items-center gap-1 text-xs font-semibold text-fg"
            aria-expanded={!openBlockCollapsed}
          >
            <span className="text-muted" aria-hidden>
              {openBlockCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>{' '}
            Open folder
          </button>
          {openBlockCollapsed && (
            <button
              type="button"
              onClick={onOpenFolderClick}
              aria-label="Open folder"
              className="btn-gradient rounded px-2 py-0.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
        {!openBlockCollapsed && (
          <>
            <button
              type="button"
              onClick={onOpenFolderClick}
              className="btn-gradient mt-2 w-full rounded-theme-md px-3 py-2 text-sm font-medium"
            >
              + Open folder
            </button>
            <p className="mt-2 text-center text-[0.625rem] text-muted">
              or drag &amp; drop a folder or file here
            </p>
          </>
        )}
        <div className="mt-2">
          <SidebarFilter value={filter} onChange={setFilter} />
        </div>
      </div>
      <PanelGroup direction="vertical" autoSaveId="mdreader.sidebar.split.v1" className="min-h-0 flex-1">
        <Panel defaultSize={70} minSize={20} className="overflow-y-auto p-2">
          {folders.map((f) => (
            <FolderSection
              key={f.id}
              folder={f}
              activeFile={activeFile}
              markdownOnly={markdownOnly}
              onPickFile={onPickFile}
              onClose={onCloseFolder}
              onCopyFolderPath={onCopyFolderPath}
              onDropFolderOnTerminal={onDropFolderOnTerminal}
              filter={filter}
              flashRelativePath={flashing?.folderId === f.id ? flashing.relativePath : null}
              menuAutoHide={menuAutoHide}
            />
          ))}
          {filter && !filteredHasAny && (
            <p className="px-2 py-3 text-xs text-muted">
              No files match &quot;{filter}&quot;
            </p>
          )}
        </Panel>
        {gitPanel && (
          <>
            <PanelResizeHandle
              className="h-1.5 shrink-0 cursor-row-resize bg-border transition-colors hover:bg-accent"
              style={{ display: gitVisible ? undefined : 'none' }}
            />
            <Panel
              ref={gitPanelRef}
              defaultSize={30}
              minSize={10}
              collapsible
              collapsedSize={0}
              className="overflow-hidden"
              onCollapse={() => { if (gitReadyRef.current) onGitVisibilityChange?.(false); }}
              onExpand={() => { if (gitReadyRef.current) onGitVisibilityChange?.(true); }}
            >
              {gitPanel}
            </Panel>
          </>
        )}
      </PanelGroup>
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/10 text-sm font-medium text-accent">
          Drop folder or files to open
        </div>
      )}
      {progress && <DropProgressBanner progress={progress} />}
    </aside>
  );
}

function DropProgressBanner({ progress }: { progress: DropProgress }) {
  const { filesScanned, mdFilesRead, lastPath } = progress;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Spinner />
        <span className="text-sm font-medium text-fg">Reading dropped files</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
        <div>
          <div className="text-[0.625rem] uppercase tracking-wide">Read</div>
          <div className="font-mono text-base text-accent">{mdFilesRead}</div>
        </div>
        <div>
          <div className="text-[0.625rem] uppercase tracking-wide">Scanned</div>
          <div className="font-mono text-base text-muted">{filesScanned + mdFilesRead}</div>
        </div>
      </div>
      <div className="mt-1 truncate text-[0.625rem] text-muted" title={lastPath}>
        {lastPath || ' '}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
