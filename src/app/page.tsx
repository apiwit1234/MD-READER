'use client';
import dynamic from 'next/dynamic';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';
import { Sidebar } from '@/components/Sidebar';
import { TabBar, type TabView } from '@/components/TabBar';
import { StatusStrip } from '@/components/StatusStrip';
import { EmptyState } from '@/components/EmptyState';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsModal } from '@/components/SettingsModal';
import { themeMode } from '@/lib/themes';
import { loadState, saveState, defaultState, clearedState, saveSearchState, loadBottomPanelState, saveBottomPanelState, loadMode, saveMode } from '@/lib/storage';
import { pickNextColor, rgbTripletToHex } from '@/lib/colors';
import { getApi, hasApi, type SpawnWindowInitial, type AppSettings, type CustomFont } from '@/lib/electron-api';
import { buildFontChain } from '@/lib/fonts';
import { getWindowContext, withWindowSuffix } from '@/lib/window-context';
import type { DropResult } from '@/lib/drop';
import type { AppState, OpenedFolder, Theme, BottomPanelState, SearchResponse } from '@/types';
import { DEFAULT_SEARCH_STATE, DEFAULT_BOTTOM_PANEL_STATE } from '@/types';
import type { TerminalPanelHandle } from '@/components/TerminalPanel';
import { BottomPanel } from '@/components/BottomPanel';
import { SearchPanel, type OpenResultArg } from '@/components/SearchPanel';
import { SearchModal } from '@/components/SearchModal';
import { installGlobalKeyboard } from '@/lib/keyboard';
import { applyZoomStep } from '@/lib/zoom';
import { flagFromPanelEvent } from '@/lib/panel-sync';
import { reloadAction, isUnderRoot, type BufferState } from '@/lib/live-reload';
import { revealFile } from '@/lib/sidebar-events';
import { ModeSwitcher } from '@/components/ModeSwitcher';
import type { Mode } from '@/lib/mode';
import { ContentStore } from '@/lib/content-store';
import { CodeEditor } from '@/components/CodeEditor';
import { GitPanel } from '@/components/GitPanel';
import { DiffView } from '@/components/DiffView';
import type { GitRepo, GitFileStatus } from '@/types';
import { isMarkdownPath, isMermaidPath } from '@/lib/file-kinds';

const MarkdownView = dynamic(
  () => import('@/components/MarkdownView').then((m) => m.MarkdownView),
  { ssr: false },
);

// Wraps MermaidBlock (browser-only APIs), so client-side only like MarkdownView.
const DiagramView = dynamic(
  () => import('@/components/DiagramView').then((m) => m.DiagramView),
  { ssr: false },
);

const TerminalPanel = dynamic(
  () => import('@/components/TerminalPanel').then((m) => m.TerminalPanel),
  { ssr: false },
);

type ViewFlags = {
  sidebar: boolean;
  tabBar: boolean;
  terminal: boolean;
  git: boolean;
};

const DEFAULT_VIEW_FLAGS: ViewFlags = {
  sidebar: true,
  tabBar: true,
  terminal: false,
  git: true,
};

const VIEW_FLAGS_KEY_BASE = 'mdreader.viewFlags.v2';

function viewFlagsKey(): string {
  return typeof window !== 'undefined' ? withWindowSuffix(VIEW_FLAGS_KEY_BASE) : VIEW_FLAGS_KEY_BASE;
}

function loadViewFlags(): ViewFlags {
  if (typeof localStorage === 'undefined') return DEFAULT_VIEW_FLAGS;
  try {
    const raw = localStorage.getItem(viewFlagsKey());
    if (!raw) return DEFAULT_VIEW_FLAGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_VIEW_FLAGS, ...parsed };
  } catch {
    return DEFAULT_VIEW_FLAGS;
  }
}

/** Tabs visible in MD mode: markdown/diagram files plus synthetic mermaid/diff tabs. */
function isMdVisible(t: { folderId: string; relativePath: string }): boolean {
  if (t.folderId === '__diagrams__' || t.folderId === '__diff__') return true;
  return /\.(md|markdown|mmd|mermaid)$/i.test(t.relativePath);
}

/** Absolute host path for a file inside an opened (non-virtual) folder. */
function joinHostPath(hostPath: string, relativePath: string): string {
  const sep = hostPath.includes('\\') ? '\\' : '/';
  return hostPath + sep + relativePath.replace(/\//g, sep);
}

export default function Page() {
  const [state, setState] = useState<AppState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [content, setContent] = useState<string>('');
  const [activeHostPath, setActiveHostPath] = useState<string | null>(null);
  const [virtualContents, setVirtualContents] = useState<Record<string, string>>({});
  const [viewFlags, setViewFlags] = useState<ViewFlags>(DEFAULT_VIEW_FLAGS);
  const [bridgeMissing, setBridgeMissing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Cache file content by absolute path so switching back to an open tab is instant.
  const [contentCache, setContentCache] = useState<Record<string, { content: string; hostPath: string }>>({});

  // Once a user has ever shown the terminal, we keep TerminalPanel mounted so toggling off doesn't kill PTYs.
  const [terminalShownOnce, setTerminalShownOnce] = useState(false);

  // Persisted app settings (userData/settings.json) — loaded once, written
  // through updateSettings so this state always mirrors the store.
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const appSettingsRef = useRef<AppSettings | null>(null);
  useEffect(() => { appSettingsRef.current = appSettings; }, [appSettings]);

  useEffect(() => {
    if (!hasApi()) return;
    void getApi().settings.get().then(setAppSettings);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    if (!hasApi()) return;
    void getApi().settings.set(patch).then(setAppSettings);
  }, []);

  // UI size — scales chrome via the root font-size (see globals.css).
  useEffect(() => {
    const size = appSettings?.uiSize ?? 'medium';
    const root = document.documentElement;
    root.classList.toggle('ui-small', size === 'small');
    root.classList.toggle('ui-large', size === 'large');
  }, [appSettings]);

  // Content zoom — drives --content-zoom (markdown + code); the terminal
  // follows via TerminalPanel's contentZoom prop.
  useEffect(() => {
    const z = (appSettings?.contentZoom ?? 100) / 100;
    document.documentElement.style.setProperty('--content-zoom', String(z));
  }, [appSettings]);

  // Zoom applies instantly (local state) but persists DEBOUNCED — a ctrl+wheel
  // burst is many 10% steps and each settings.set is an IPC + disk write.
  const zoomSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (zoomSaveTimer.current) clearTimeout(zoomSaveTimer.current); }, []);
  const changeZoom = useCallback((direction: 1 | -1) => {
    const current = appSettingsRef.current?.contentZoom ?? 100;
    const next = applyZoomStep(current, direction);
    if (next === current) return;
    if (appSettingsRef.current) {
      setAppSettings({ ...appSettingsRef.current, contentZoom: next });
      if (zoomSaveTimer.current) clearTimeout(zoomSaveTimer.current);
      zoomSaveTimer.current = setTimeout(() => {
        zoomSaveTimer.current = null;
        updateSettings({ contentZoom: next });
      }, 350);
    } else {
      updateSettings({ contentZoom: next });
    }
    showToast(`Zoom ${next}%`);
  }, [updateSettings]);

  const resetZoom = useCallback(() => {
    if ((appSettingsRef.current?.contentZoom ?? 100) === 100) return;
    updateSettings({ contentZoom: 100 });
    showToast('Zoom 100%');
  }, [updateSettings]);

  // Custom reading fonts — list from userData/fonts, registered on demand.
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const loadedFontIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasApi()) return;
    void getApi().fonts.list().then(setCustomFonts);
  }, []);

  // Register referenced custom fonts with the document (FontFace API), once each.
  useEffect(() => {
    if (!hasApi() || !appSettings) return;
    const revertPatch = (): Partial<AppSettings> => (appSettingsRef.current?.fontSplit
      ? { fontEnglish: 'default', fontThai: 'default' }
      : { fontSource: 'default' });
    const referenced = (appSettings.fontSplit
      ? [appSettings.fontEnglish, appSettings.fontThai]
      : [appSettings.fontSource]
    ).filter((id) => id.startsWith('custom-') && !loadedFontIdsRef.current.has(id));
    for (const id of referenced) {
      loadedFontIdsRef.current.add(id);
      void getApi().fonts.data(id).then(async (r) => {
        if (!r.ok || !r.bytes) {
          loadedFontIdsRef.current.delete(id);
          showToast('Font could not be loaded — reverting to default');
          updateSettings(revertPatch());
          return;
        }
        try {
          const face = new FontFace(id, r.bytes as unknown as ArrayBuffer);
          await face.load();
          document.fonts.add(face);
        } catch {
          loadedFontIdsRef.current.delete(id);
          showToast('Font could not be loaded — reverting to default');
          updateSettings(revertPatch());
        }
      });
    }
  }, [appSettings, customFonts, updateSettings]);

  const readingFontFamily = appSettings ? buildFontChain(appSettings, customFonts) : '';

  // Stable refs so the mount-only listeners below always call the latest logic.
  const changeZoomRef = useRef(changeZoom);
  const resetZoomRef = useRef(resetZoom);
  useEffect(() => { changeZoomRef.current = changeZoom; resetZoomRef.current = resetZoom; }, [changeZoom, resetZoom]);

  // Ctrl+wheel over the reading content or terminal — like Chrome.
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-zoom-zone]')) return;
      e.preventDefault();
      changeZoomRef.current(e.deltaY < 0 ? 1 : -1);
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  const [bottomPanel, setBottomPanel] = useState<BottomPanelState>({ open: false, activeTab: 'terminal' });
  const [mode, setMode] = useState<Mode>('md');
  const [modeSwitching, setModeSwitching] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState(false);
  const modeRef = useRef(mode);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [findBarOpenForActive, setFindBarOpenForActive] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<{ query: string; caseSensitive: boolean; matchOrdinal?: number } | null>(null);
  const [lastSearch, setLastSearch] = useState<{ query: string; caseSensitive: boolean; response: SearchResponse | null }>({ query: '', caseSensitive: false, response: null });
  const [searchBusy, setSearchBusy] = useState(false);
  const searchSessionRef = useRef<string | null>(null);

  const bottomPanelRef = useRef<ImperativePanelHandle>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const topContentPanelRef = useRef<ImperativePanelHandle>(null);
  // Handle for the TerminalPanel component (type into / reset terminals).
  const terminalHandleRef = useRef<TerminalPanelHandle | null>(null);
  const contentStoreRef = useRef<ContentStore>(new ContentStore());
  // Bumped per path on external refresh; remounts CodeEditor (it ignores
  // `value` after mount by design — see CodeEditor.tsx:80).
  const [fileRevisions, setFileRevisions] = useState<Record<string, number>>({});
  // Last disk content we toasted a dirty-buffer conflict for (per path) —
  // prevents a toast per watcher tick while the user keeps editing.
  const conflictToastRef = useRef<Record<string, string>>({});
  // Reassigned every render so the IPC subscription always sees fresh state.
  const liveReloadRef = useRef<(root: string) => void>(() => {});
  // Refresh one absolute path from disk (folder-level live reload for the
  // active file + per-file watcher for any open tab). Also a render-fresh ref.
  const refreshPathRef = useRef<(absPath: string) => void>(() => {});
  // Tabs currently refreshing from an external disk change (spinner in TabBar).
  const [updatingPaths, setUpdatingPaths] = useState<Record<string, boolean>>({});
  // Bump to force a re-render when dirty state changes (the store itself is a ref).
  const [bufferTick, setBufferTick] = useState(0);
  // Last-known dirty flag per path, so we only re-render on clean<->dirty transitions
  // (NOT on every keystroke — that would re-render the whole page per character).
  const dirtyMapRef = useRef<Record<string, boolean>>({});
  const [gitRepos, setGitRepos] = useState<GitRepo[]>([]);
  const [activeRepoRoot, setActiveRepoRoot] = useState<string | null>(null);
  const [diffTitles, setDiffTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    setState(loadState());
    const legacyFlags = loadViewFlags();
    setViewFlags(legacyFlags);
    const storedBottom = loadBottomPanelState();
    const initialBottom = storedBottom.open
      ? storedBottom
      : { open: !!legacyFlags.terminal, activeTab: storedBottom.activeTab };
    setBottomPanel(initialBottom);
    setMode(loadMode());
    setHydrated(true);
    setBridgeMissing(!hasApi());
  }, []);

  // Watch opened folder roots so external file changes reach the renderer.
  const watchKey = state.openedFolders.filter((f) => !f.isVirtual).map((f) => f.hostPath).join('|');
  useEffect(() => {
    if (!hasApi() || !watchKey) return;
    const roots = watchKey.split('|');
    roots.forEach((r) => { void getApi().fs.watch(r); });
    return () => { roots.forEach((r) => { void getApi().fs.unwatch(r); }); };
  }, [watchKey]);

  // Per-file watchers: every real-file open tab gets instant change events
  // (150ms debounce in the main process vs 1200ms for the folder watcher).
  const tabFileKey = state.openTabs
    .filter((t) => !t.kind || t.kind === 'file')
    .map((t) => {
      const f = state.openedFolders.find((x) => x.id === t.folderId);
      return f && !f.isVirtual ? joinHostPath(f.hostPath, t.relativePath) : null;
    })
    .filter((p): p is string => !!p)
    .join('|');
  useEffect(() => {
    if (!hasApi() || !tabFileKey) return;
    const paths = tabFileKey.split('|');
    paths.forEach((p) => { void getApi().fs.watchFile(p); });
    return () => { paths.forEach((p) => { void getApi().fs.unwatchFile(p); }); };
  }, [tabFileKey]);

  // One-time subscription to per-file watcher events.
  useEffect(() => {
    if (!hasApi()) return;
    const off = getApi().fs.onFileChanged((absPath) => refreshPathRef.current(absPath));
    return () => { off(); };
  }, []);

  // Live-reload handler: kept in a ref (reassigned every render) so the
  // one-time IPC subscription below always calls the latest version with
  // fresh state.
  liveReloadRef.current = (root: string) => {
    const store = contentStoreRef.current;
    const activeAbs = activeAbsPath();

    // 1) Invalidate cached content under this root (except the active file,
    //    which is refreshed explicitly below).
    setContentCache((c) => {
      let changed = false;
      const next: typeof c = {};
      for (const [p, v] of Object.entries(c)) {
        if (p !== activeAbs && isUnderRoot(p, root)) { changed = true; continue; }
        next[p] = v;
      }
      return changed ? next : c;
    });

    // 2) Drop clean non-active buffers so reopening re-seeds from disk.
    for (const p of store.paths()) {
      if (p !== activeAbs && isUnderRoot(p, root)) store.dropIfClean(p);
    }

    // 3) Refresh the active file when it lives under this root. (Per-file
    //    watchers refresh open tabs directly; this folder-level path remains
    //    the fallback for the active file.)
    if (!activeAbs || !isUnderRoot(activeAbs, root)) return;
    refreshPathRef.current(activeAbs);
  };

  // Re-read one path from disk and reconcile cache/buffer/view. The tab shows
  // a spinner from now until the refreshed view commits; the heavy preview
  // re-render runs in a transition so the UI never blocks.
  refreshPathRef.current = (absPath: string) => {
    if (!hasApi()) return;
    const store = contentStoreRef.current;
    setUpdatingPaths((u) => (u[absPath] ? u : { ...u, [absPath]: true }));
    const clearUpdating = () =>
      setUpdatingPaths((u) => {
        if (!u[absPath]) return u;
        const next = { ...u };
        delete next[absPath];
        return next;
      });
    getApi().fs.read(absPath)
      .then((d) => {
        const known = contentCache[absPath]?.content;
        const buffer: BufferState =
          store.get(absPath) === undefined ? 'none' : store.isDirty(absPath) ? 'dirty' : 'clean';
        const action = reloadAction(d.content, known, buffer);
        if (action === 'ignore') {
          clearUpdating();
          return;
        }
        if (action === 'refresh') {
          store.replaceIfClean(absPath, d.content);
          startTransition(() => {
            setContentCache((c) => ({ ...c, [absPath]: { content: d.content, hostPath: d.hostPath } }));
            // Only the visible file drives the content view; background tabs
            // just get their cache/buffer refreshed.
            if (absPath === activeAbsPath()) setContent(d.content);
            setFileRevisions((r) => ({ ...r, [absPath]: (r[absPath] ?? 0) + 1 }));
            clearUpdating();
          });
        } else {
          setContentCache((c) => ({ ...c, [absPath]: { content: d.content, hostPath: d.hostPath } }));
          clearUpdating();
          if (conflictToastRef.current[absPath] !== d.content) {
            conflictToastRef.current[absPath] = d.content;
            showToast('File changed on disk — your unsaved edits are kept');
          }
        }
      })
      .catch(() => {
        // Transient (atomic rename-write) or deleted file — keep the current
        // view; the next watcher event retries.
        clearUpdating();
      });
  };

  // One-time subscription to watcher events.
  useEffect(() => {
    if (!hasApi()) return;
    const off = getApi().fs.onChanged((root) => liveReloadRef.current(root));
    return () => { off(); };
  }, []);

  // Receive initial state via IPC for spawned (tear-off) windows.
  useEffect(() => {
    if (!hasApi()) return;
    const off = getApi().app.onInitialState((init) => {
      setState((s) => {
        const hasFolder = s.openedFolders.some((f) => f.id === init.folder.id);
        const folders = hasFolder ? s.openedFolders : [...s.openedFolders, init.folder];
        const existingTab = s.openTabs.find(
          (t) => t.folderId === init.tab.folderId && t.relativePath === init.tab.relativePath,
        );
        const baseTabs = s.openTabs.map((t) => ({ ...t, active: false }));
        const tabs = existingTab
          ? baseTabs.map((t) =>
              t.folderId === init.tab.folderId && t.relativePath === init.tab.relativePath
                ? { ...t, active: true }
                : t,
            )
          : [...baseTabs, { ...init.tab, active: true }];
        return { ...s, openedFolders: folders, openTabs: tabs };
      });
      setVirtualContents((prev) => {
        const next = { ...prev };
        if (init.folderContents) {
          for (const [k, v] of Object.entries(init.folderContents)) next[k] = v;
        }
        if (init.content) {
          const key = `${init.tab.folderId}::${init.tab.relativePath}`;
          next[key] = init.content;
        }
        return next;
      });
    });
    return () => { off(); };
  }, []);

  // Handle .md files opened from the OS (file shortcut / "Open with").
  useEffect(() => {
    if (!hydrated || !hasApi()) return;
    const off = getApi().app.onOpenFile((filePath) => {
      void openFileShortcut(filePath);
    });
    return () => { off(); };
    // openFileShortcut is defined inline below and stable enough; ignore exhaustive deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, state.openedFolders]);

  function splitPath(absPath: string): { dir: string; file: string; sep: string } {
    const sep = absPath.includes('\\') ? '\\' : '/';
    const idx = absPath.lastIndexOf(sep);
    if (idx < 0) return { dir: '', file: absPath, sep };
    return { dir: absPath.slice(0, idx), file: absPath.slice(idx + 1), sep };
  }

  function pathToRelative(folderHostPath: string, fileAbsPath: string, sep: string): string {
    const fp = fileAbsPath;
    if (!fp.startsWith(folderHostPath)) return '';
    let rel = fp.slice(folderHostPath.length);
    if (rel.startsWith(sep)) rel = rel.slice(1);
    return rel.split(sep).join('/');
  }

  async function openFileShortcut(filePath: string) {
    if (!isMarkdownPath(filePath) && !isMermaidPath(filePath)) return;
    const { dir, sep } = splitPath(filePath);
    // If an opened folder already contains this file, reuse it; otherwise add the parent dir as a folder.
    let parent = state.openedFolders.find(
      (f) => !f.isVirtual && filePath.toLowerCase().startsWith(f.hostPath.toLowerCase() + sep),
    );
    let folderId = parent?.id ?? null;
    if (!parent && dir) {
      const id = crypto.randomUUID();
      const parts = dir.split(/[\\/]/).filter(Boolean);
      const name = parts[parts.length - 1] ?? dir;
      const color = pickNextColor(state.openedFolders.map((f) => f.color));
      const newFolder: OpenedFolder = { id, hostPath: dir, name, color, expanded: true };
      setState((s) => ({
        ...s,
        openedFolders: [...s.openedFolders, newFolder],
        recentFolders: [
          { hostPath: dir, lastOpenedAt: Date.now() },
          ...s.recentFolders.filter((r) => r.hostPath !== dir),
        ].slice(0, 10),
      }));
      parent = newFolder;
      folderId = id;
    }
    if (!folderId || !parent) return;
    const rel = pathToRelative(parent.hostPath, filePath, sep);
    if (!rel) return;
    pickFile(folderId, rel);
  }

  useEffect(() => {
    if (!hydrated) return;
    const persistable: AppState = {
      ...state,
      openedFolders: state.openedFolders.filter((f) => !f.isVirtual),
      openTabs: state.openTabs.filter((t) => {
        const folder = state.openedFolders.find((f) => f.id === t.folderId);
        return folder ? !folder.isVirtual : true;
      }),
    };
    saveState(persistable);
  }, [state, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(viewFlagsKey(), JSON.stringify(viewFlags));
  }, [viewFlags, hydrated]);

  useEffect(() => {
    if (hydrated) saveMode(mode);
    modeRef.current = mode;
  }, [mode, hydrated]);

  // Switch mode with a brief loading overlay (the Code editor / language load can lag).
  function changeMode(next: Mode) {
    setMode((cur) => {
      if (cur === next) return cur;
      setModeSwitching(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setModeSwitching(false)));
      return next;
    });
  }

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', state.theme);
    // The `.dark` class follows the theme's light/dark BASE (so Space also gets
    // dark prose/highlight/mermaid/find-hit), while `data-theme` drives the
    // per-theme color tokens. Also keeps not-yet-migrated `dark:` utilities working.
    root.classList.toggle('dark', themeMode(state.theme) === 'dark');
  }, [state.theme, hydrated]);

  // Keep the OS window background in the theme's surface color (no white
  // flash on launch; painted behind the frameless window).
  useEffect(() => {
    if (!hydrated || !hasApi()) return;
    const root = document.documentElement;
    const surface = getComputedStyle(root).getPropertyValue('--c-surface');
    const hex = rgbTripletToHex(surface);
    if (hex) void getApi().window.setTitleBarColors(hex);
  }, [state.theme, hydrated]);

  useEffect(() => {
    if ((bottomPanel.open && bottomPanel.activeTab === 'terminal') && !terminalShownOnce) setTerminalShownOnce(true);
  }, [bottomPanel.open, bottomPanel.activeTab, terminalShownOnce]);

  // Programmatically collapse/expand the bottom panel (keeps it mounted).
  // After a drag-collapse the remembered size can be ~0, so expanding would
  // reopen an invisible panel — snap back to the default size in that case.
  useEffect(() => {
    const panel = bottomPanelRef.current;
    if (!panel) return;
    if (bottomPanel.open) {
      panel.expand();
      if (panel.getSize() < 10) panel.resize(35);
    } else panel.collapse();
  }, [bottomPanel.open]);

  // Persist bottom panel state to storage.
  useEffect(() => {
    if (hydrated) saveBottomPanelState(bottomPanel);
  }, [bottomPanel, hydrated]);

  // Forward uncaught renderer errors to the main-process log file.
  useEffect(() => {
    if (!hasApi()) return;
    const onError = (e: ErrorEvent) => {
      try { void getApi().app.logError('renderer', `${e.message} @ ${e.filename}:${e.lineno}\n${e.error?.stack ?? ''}`); } catch {}
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      try { void getApi().app.logError('unhandledRejection', (r && r.stack) || String(r)); } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // Update lifecycle UI: a persistent header pill while an update awaits a
  // restart, and a one-time confirmation toast on the first launch after one.
  const [updateReady, setUpdateReady] = useState<string | null>(null);
  useEffect(() => {
    if (!hasApi()) return;
    const off = getApi().update.onUpdateReady((version) => {
      setUpdateReady(version);
      showToast(`Update v${version} downloaded — restart MD Reader to apply`, 6000);
    });
    void getApi().app.versionInfo().then((info) => {
      if (info.updatedFrom) showToast(`MD Reader updated to v${info.current} ✓`, 6000);
    });
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing the window with unsaved editor buffers.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (contentStoreRef.current.dirtyPaths().length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Install global keyboard shortcuts.
  useEffect(() => {
    return installGlobalKeyboard({
      onOpenFind: () => setFindBarOpenForActive(true),
      onOpenGlobalSearch: () => setSearchModalOpen(true),
      onSetMode: (m) => changeMode(m),
      getMode: () => modeRef.current,
      onZoom: (d) => changeZoomRef.current(d),
      onZoomReset: () => resetZoomRef.current(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same pattern for sidebar — keep Panel in the layout so user-resized width persists across toggles.
  // Reopen at the default width when the remembered size collapsed to ~0 (drag-close).
  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    // Terminal mode always hides the sidebar, regardless of the user's toggle.
    if (viewFlags.sidebar && mode !== 'terminal') {
      panel.expand();
      if (panel.getSize() < 15) panel.resize(20);
    } else panel.collapse();
  }, [viewFlags.sidebar, mode]);

  // Full Terminal mode: collapse the top content panel and force the terminal open & maximized.
  // Switching away restores the previous split. (Sidebar is handled by the effect above.)
  useEffect(() => {
    const top = topContentPanelRef.current;
    if (mode === 'terminal') {
      setBottomPanel({ open: true, activeTab: 'terminal' });
      top?.collapse();
    } else {
      top?.expand();
    }
  }, [mode]);

  // Detect which opened folders are git repositories.
  useEffect(() => {
    if (!hasApi()) return;
    let cancelled = false;
    (async () => {
      const found: GitRepo[] = [];
      for (const f of state.openedFolders) {
        if (f.isVirtual) continue;
        const d = await getApi().git.detect(f.hostPath);
        if (d.isRepo && d.root && !found.some((r) => r.root === d.root)) {
          const name = d.root.split(/[\\/]/).filter(Boolean).pop() || d.root;
          found.push({ folderId: f.id, root: d.root, name });
        }
      }
      if (cancelled) return;
      setGitRepos(found);
      setActiveRepoRoot((cur) => (cur && found.some((r) => r.root === cur) ? cur : found[0]?.root ?? null));
    })();
    return () => { cancelled = true; };
  }, [state.openedFolders]);

  const activeTab = state.openTabs.find((t) => t.active) ?? null;

  // MD mode shows only markdown. If a code file is active when entering MD mode,
  // switch to the first open markdown tab — or leave nothing active (empty page).
  useEffect(() => {
    if (mode !== 'md' || !activeTab || isMdVisible(activeTab)) return;
    setState((s) => {
      const firstMd = s.openTabs.find(isMdVisible);
      return { ...s, openTabs: s.openTabs.map((t) => ({ ...t, active: firstMd ? t === firstMd : false })) };
    });
  }, [mode, activeTab]);

  // Point the git panel at the repo containing the active file.
  useEffect(() => {
    if (!activeTab) return;
    const folder = state.openedFolders.find((f) => f.id === activeTab.folderId);
    if (!folder || folder.isVirtual) return;
    const match = gitRepos.find((r) => folder.hostPath === r.root || folder.hostPath.startsWith(r.root));
    if (match) setActiveRepoRoot(match.root);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gitRepos]);

  async function openDiffTab(root: string, file: GitFileStatus, staged: boolean) {
    const res = await getApi().git.diff(root, file.path, staged);
    const unified = res.ok ? res.stdout : '';
    const relativePath = `Diff-${staged ? 'staged' : 'work'}-${file.path}`;
    const key = `__diff__::${relativePath}`;
    setVirtualContents((prev) => ({ ...prev, [key]: unified }));
    setDiffTitles((prev) => ({ ...prev, [key]: file.path }));
    setState((s) => {
      const cleared = s.openTabs.map((t) => ({ ...t, active: false }));
      const exists = s.openTabs.find((t) => t.folderId === '__diff__' && t.relativePath === relativePath);
      if (exists) {
        return { ...s, openTabs: cleared.map((t) => (t.folderId === '__diff__' && t.relativePath === relativePath ? { ...t, active: true } : t)) };
      }
      return { ...s, openTabs: [...cleared, { folderId: '__diff__', relativePath, active: true, kind: 'diff' as const }] };
    });
  }

  useEffect(() => {
    if (!activeTab) {
      setContent('');
      setActiveHostPath(null);
      return;
    }
    // Mermaid-in-tab pseudo-files: synthetic folderId, content stored in virtualContents.
    if (activeTab.kind === 'mermaid') {
      const key = `${activeTab.folderId}::${activeTab.relativePath}`;
      setContent(virtualContents[key] ?? '');
      setActiveHostPath(null);
      return;
    }
    const folder = state.openedFolders.find((f) => f.id === activeTab.folderId);
    if (!folder) return;
    if (folder.isVirtual) {
      const key = `${folder.id}::${activeTab.relativePath}`;
      setContent(virtualContents[key] ?? '# (dropped file unavailable — refresh lost the in-memory content)');
      setActiveHostPath(null);
      return;
    }
    if (!hasApi()) {
      setContent('# Electron bridge unavailable');
      setActiveHostPath(null);
      return;
    }
    const sep = folder.hostPath.includes('\\') ? '\\' : '/';
    const absPath = folder.hostPath + sep + activeTab.relativePath.replace(/\//g, sep);

    // Instant if cached — no fetch round-trip.
    const cached = contentCache[absPath];
    if (cached) {
      setContent(cached.content);
      setActiveHostPath(cached.hostPath);
      if (contentStoreRef.current.get(absPath) === undefined) contentStoreRef.current.seed(absPath, cached.content);
      return;
    }

    let cancelled = false;
    getApi().fs.read(absPath)
      .then((d) => {
        if (cancelled) return;
        setContent(d.content);
        setActiveHostPath(d.hostPath);
        setContentCache((c) => ({ ...c, [absPath]: { content: d.content, hostPath: d.hostPath } }));
        if (contentStoreRef.current.get(absPath) === undefined) contentStoreRef.current.seed(absPath, d.content);
      })
      .catch(() => {
        if (cancelled) return;
        setContent('# Could not read file');
        setActiveHostPath(null);
      });
    return () => { cancelled = true; };
  }, [activeTab, state.openedFolders, virtualContents, contentCache]);

  const tabViews: TabView[] = useMemo(() => {
    const mapped = state.openTabs.map((t) => {
      const folder = state.openedFolders.find((f) => f.id === t.folderId);
      const fallbackColor = t.kind === 'mermaid' ? '#a855f7' : '#94a3b8';
      let abs: string | null = null;
      if (folder && !folder.isVirtual) {
        const sep = folder.hostPath.includes('\\') ? '\\' : '/';
        abs = folder.hostPath + sep + t.relativePath.replace(/\//g, sep);
      }
      return {
        folderId: t.folderId,
        relativePath: t.relativePath,
        active: t.active,
        color: folder?.color ?? fallbackColor,
        filename: t.relativePath.split('/').pop() || t.relativePath,
        pinned: t.pinned,
        dirty: abs ? contentStoreRef.current.isDirty(abs) : false,
        updating: abs ? !!updatingPaths[abs] : false,
      };
    });
    // Pinned first, preserve order within each group.
    const pinned = mapped.filter((t) => t.pinned);
    const rest = mapped.filter((t) => !t.pinned);
    return [...pinned, ...rest];
    // bufferTick re-derives dirty flags after edits/saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.openTabs, state.openedFolders, bufferTick, updatingPaths]);

  // MD mode only lists markdown tabs; Code/Terminal list everything.
  const visibleTabViews = useMemo(
    () => (mode === 'md' ? tabViews.filter(isMdVisible) : tabViews),
    [tabViews, mode],
  );

  function activeAbsPath(): string | null {
    if (!activeTab) return null;
    const folder = state.openedFolders.find((f) => f.id === activeTab.folderId);
    if (!folder || folder.isVirtual) return null;
    const sep = folder.hostPath.includes('\\') ? '\\' : '/';
    return folder.hostPath + sep + activeTab.relativePath.replace(/\//g, sep);
  }

  function handleEditorChange(absPath: string, text: string) {
    const store = contentStoreRef.current;
    store.set(absPath, text);
    // Only re-render when the dirty dot needs to flip — not on every keystroke.
    const dirty = store.isDirty(absPath);
    if (dirtyMapRef.current[absPath] !== dirty) {
      dirtyMapRef.current[absPath] = dirty;
      setBufferTick((n) => n + 1);
    }
  }

  async function handleEditorSave(absPath: string) {
    const store = contentStoreRef.current;
    const text = store.get(absPath);
    if (text === undefined) return;
    const roots = state.openedFolders.filter((f) => !f.isVirtual).map((f) => f.hostPath);
    const res = await getApi().fs.write(absPath, text, roots);
    if (res.ok) {
      store.markSaved(absPath);
      dirtyMapRef.current[absPath] = false;
      setContent(text);
      setContentCache((c) => ({ ...c, [absPath]: { content: text, hostPath: absPath } }));
      setBufferTick((n) => n + 1);
      // Nudge the git panel to re-read status (it refreshes on window focus).
      window.dispatchEvent(new Event('focus'));
      showToast('Saved');
    } else {
      showToast('Save failed: ' + res.error);
    }
  }

  function setTheme(theme: Theme) {
    setState((s) => ({ ...s, theme }));
  }

  function setFavorites(favorites: [Theme, Theme]) {
    setState((s) => ({ ...s, themeFavorites: favorites }));
  }

  function openFolder(hostPath: string) {
    setPickerOpen(false);
    if (state.openedFolders.some((f) => f.hostPath === hostPath)) return;
    const parts = hostPath.split(/[\\/]/).filter(Boolean);
    const name = parts[parts.length - 1] ?? hostPath;
    const color = pickNextColor(state.openedFolders.map((f) => f.color));
    const newFolder: OpenedFolder = {
      id: crypto.randomUUID(),
      hostPath,
      name,
      color,
      expanded: true,
    };
    setState((s) => ({
      ...s,
      openedFolders: [...s.openedFolders, newFolder],
      recentFolders: [
        { hostPath, lastOpenedAt: Date.now() },
        ...s.recentFolders.filter((r) => r.hostPath !== hostPath),
      ].slice(0, 10),
    }));
  }

  function onDropFolder(result: DropResult) {
    const id = crypto.randomUUID();
    const color = pickNextColor(state.openedFolders.map((f) => f.color));

    // If Electron gave us a real host path, pin as a normal folder so copy-path
    // and fs.read all work the same as a picker-opened folder. We still seed the
    // already-read content into the cache so the first file is instant.
    if (result.hostPath) {
      const folder: OpenedFolder = {
        id,
        hostPath: result.hostPath,
        name: result.tree.name,
        color,
        expanded: true,
      };
      const sep = result.hostPath.includes('\\') ? '\\' : '/';
      setContentCache((c) => {
        const next = { ...c };
        for (const [rel, content] of Object.entries(result.contents)) {
          const absPath = result.hostPath + sep + rel.replace(/\//g, sep);
          next[absPath] = { content, hostPath: absPath };
        }
        return next;
      });
      setState((s) => ({
        ...s,
        openedFolders: [...s.openedFolders, folder],
        recentFolders: [
          { hostPath: result.hostPath!, lastOpenedAt: Date.now() },
          ...s.recentFolders.filter((r) => r.hostPath !== result.hostPath),
        ].slice(0, 10),
      }));
      return;
    }

    // Fallback: legacy virtual folder (drag-and-drop API didn't give us a path).
    const folder: OpenedFolder = {
      id,
      hostPath: '(dropped)',
      name: result.tree.name,
      color,
      expanded: true,
      isVirtual: true,
      virtualTree: result.tree,
    };
    setVirtualContents((prev) => {
      const next = { ...prev };
      for (const [rel, text] of Object.entries(result.contents)) {
        next[`${id}::${rel}`] = text;
      }
      return next;
    });
    setState((s) => ({ ...s, openedFolders: [...s.openedFolders, folder] }));
  }

  function closeFolder(folderId: string) {
    setState((s) => {
      const remainingTabs = s.openTabs.filter((t) => t.folderId !== folderId);
      const reactivated = activateLastIfNoActive(remainingTabs);
      return {
        ...s,
        openedFolders: s.openedFolders.filter((f) => f.id !== folderId),
        openTabs: reactivated,
      };
    });
    setVirtualContents((prev) => {
      const next: Record<string, string> = {};
      for (const key of Object.keys(prev)) {
        if (!key.startsWith(`${folderId}::`)) next[key] = prev[key];
      }
      return next;
    });
  }

  function pickFile(folderId: string, relativePath: string) {
    setState((s) => {
      const existing = s.openTabs.find((t) => t.folderId === folderId && t.relativePath === relativePath);
      if (existing) {
        return {
          ...s,
          openTabs: s.openTabs.map((t) => ({
            ...t,
            active: t.folderId === folderId && t.relativePath === relativePath,
          })),
        };
      }
      const cleared = s.openTabs.map((t) => ({ ...t, active: false }));
      return { ...s, openTabs: [...cleared, { folderId, relativePath, active: true }] };
    });
    // Opening a non-markdown/diagram file in MD mode is meaningless; jump to Code mode.
    if (mode === 'md' && !isMarkdownPath(relativePath) && !isMermaidPath(relativePath)) {
      setMode('code');
    }
  }

  function focusTab(folderId: string, relativePath: string) {
    setState((s) => ({
      ...s,
      openTabs: s.openTabs.map((t) => ({
        ...t,
        active: t.folderId === folderId && t.relativePath === relativePath,
      })),
    }));
  }

  function closeTab(folderId: string, relativePath: string) {
    const folder = state.openedFolders.find((f) => f.id === folderId);
    if (folder && !folder.isVirtual) {
      const sep = folder.hostPath.includes('\\') ? '\\' : '/';
      const abs = folder.hostPath + sep + relativePath.replace(/\//g, sep);
      if (contentStoreRef.current.isDirty(abs) && !window.confirm(`Discard unsaved changes to ${relativePath}?`)) {
        return;
      }
    }
    setState((s) => {
      const idx = s.openTabs.findIndex((t) => t.folderId === folderId && t.relativePath === relativePath);
      if (idx < 0) return s;
      const wasActive = s.openTabs[idx].active;
      const filtered = s.openTabs.filter((_, i) => i !== idx);
      if (!wasActive || filtered.length === 0) return { ...s, openTabs: filtered };
      const newActiveIdx = Math.max(0, idx - 1);
      return {
        ...s,
        openTabs: filtered.map((t, i) => ({ ...t, active: i === newActiveIdx })),
      };
    });
  }

  function closeOtherTabs(folderId: string, relativePath: string) {
    setState((s) => ({
      ...s,
      openTabs: s.openTabs
        .filter((t) => t.folderId === folderId && t.relativePath === relativePath)
        .map((t) => ({ ...t, active: true })),
    }));
  }

  function closeAllTabs() {
    setState((s) => ({ ...s, openTabs: [] }));
  }

  function togglePin(tab: TabView) {
    setState((s) => ({
      ...s,
      openTabs: s.openTabs.map((t) =>
        t.folderId === tab.folderId && t.relativePath === tab.relativePath
          ? { ...t, pinned: !t.pinned }
          : t,
      ),
    }));
  }

  function tearOffTab(tab: TabView, screenX?: number, screenY?: number) {
    if (!hasApi()) return;
    const openTab = state.openTabs.find(
      (t) => t.folderId === tab.folderId && t.relativePath === tab.relativePath,
    );
    if (!openTab) return;

    let folder: OpenedFolder | undefined = state.openedFolders.find((f) => f.id === tab.folderId);

    // Mermaid tabs use synthetic folderId; fabricate a folder for the new window.
    if (!folder && openTab.kind === 'mermaid') {
      folder = {
        id: '__diagrams__',
        hostPath: '(diagrams)',
        name: 'Diagrams',
        color: '#a855f7',
        expanded: true,
        isVirtual: true,
        virtualTree: { name: 'Diagrams', type: 'dir', relativePath: '', children: [] },
      };
    }
    if (!folder) return;

    const isMermaid = openTab.kind === 'mermaid';
    const isVirtualFolder = folder.isVirtual === true;
    const virtualKey = `${folder.id}::${openTab.relativePath}`;
    const content = isMermaid ? virtualContents[virtualKey] : undefined;

    // For virtual (drag-dropped) folders, ship the full content map so other files
    // in the same folder can be opened in the spawned window.
    let folderContents: Record<string, string> | undefined;
    if (isVirtualFolder) {
      folderContents = {};
      const prefix = `${folder.id}::`;
      for (const [key, val] of Object.entries(virtualContents)) {
        if (key.startsWith(prefix)) folderContents[key] = val;
      }
    }

    const initial: SpawnWindowInitial = {
      folder: { ...folder, expanded: true },
      tab: { ...openTab, active: true },
      content,
      folderContents,
    };

    void getApi().window.spawn({ x: screenX, y: screenY, initial });

    // Remove tab from this window.
    closeTab(openTab.folderId, openTab.relativePath);
  }

  const openMermaidInNewTab = useCallback((source: string) => {
    const idSuffix = crypto.randomUUID().slice(0, 6);
    const relativePath = `Diagram-${idSuffix}.md`;
    const key = `__diagrams__::${relativePath}`;
    setVirtualContents((prev) => ({ ...prev, [key]: '```mermaid\n' + source + '\n```' }));
    setState((s) => {
      const cleared = s.openTabs.map((t) => ({ ...t, active: false }));
      return {
        ...s,
        openTabs: [
          ...cleared,
          { folderId: '__diagrams__', relativePath, active: true, kind: 'mermaid' as const },
        ],
      };
    });
  }, []);

  function tabAbsolutePath(tab: TabView): string | null {
    const folder = state.openedFolders.find((f) => f.id === tab.folderId);
    if (!folder) return null;
    if (folder.isVirtual) return tab.relativePath;
    const sep = folder.hostPath.includes('\\') ? '\\' : '/';
    return folder.hostPath + sep + tab.relativePath.replace(/\//g, sep);
  }

  function tabFolderPath(tab: TabView): string | null {
    const folder = state.openedFolders.find((f) => f.id === tab.folderId);
    if (!folder) return null;
    if (folder.isVirtual) return folder.name;
    const sep = folder.hostPath.includes('\\') ? '\\' : '/';
    // If the file is in a subfolder, return that subfolder; else return the folder root.
    const lastSlash = tab.relativePath.lastIndexOf('/');
    if (lastSlash < 0) return folder.hostPath;
    const subRel = tab.relativePath.slice(0, lastSlash).replace(/\//g, sep);
    return folder.hostPath + sep + subRel;
  }

  function copyTabPath(tab: TabView) {
    const p = tabAbsolutePath(tab);
    if (!p) return;
    void navigator.clipboard.writeText(p).then(
      () => showToast('File path copied'),
      () => showToast('Copy failed'),
    );
  }

  function copyTabFolderPath(tab: TabView) {
    const p = tabFolderPath(tab);
    if (!p) return;
    void navigator.clipboard.writeText(p).then(
      () => showToast('Folder path copied'),
      () => showToast('Copy failed'),
    );
  }

  function dropTabOnTerminal(tab: TabView) {
    const p = tabAbsolutePath(tab);
    if (!p) return;
    terminalHandleRef.current?.typeIntoActive(p);
    if (!(bottomPanel.open && bottomPanel.activeTab === 'terminal')) {
      setBottomPanel({ open: true, activeTab: 'terminal' });
    }
    showToast('Pasted into terminal');
  }

  function dropFolderOnTerminal(hostPath: string) {
    terminalHandleRef.current?.typeIntoActive(hostPath);
    if (!(bottomPanel.open && bottomPanel.activeTab === 'terminal')) {
      setBottomPanel({ open: true, activeTab: 'terminal' });
    }
    showToast('Pasted into terminal');
  }

  function showToast(msg: string, durationMs = 1500) {
    setToast(msg);
    setTimeout(() => setToast(null), durationMs);
  }

  function resetDefaults() {
    if (!hasApi()) return;
    void getApi().settings.reset().then((s) => {
      setAppSettings(s);
      setState((st) => ({ ...st, theme: 'light', themeFavorites: ['light', 'dark'] }));
      showToast('Settings reset to defaults');
    });
  }

  function clearAll() {
    // Workspace content only — theme/favorites/settings survive (clearedState).
    setState((s) => clearedState(s));
    setVirtualContents({});
    setLastSearch({ query: '', caseSensitive: false, response: null });
    saveSearchState({ ...DEFAULT_SEARCH_STATE });
    setBottomPanel({ ...DEFAULT_BOTTOM_PANEL_STATE });
    terminalHandleRef.current?.resetAll();
    setConfirmClear(false);
    showToast('Cleared folders, tabs, search and terminals');
  }

  function toggleView(key: keyof ViewFlags) {
    setViewFlags((v) => ({ ...v, [key]: !v[key] }));
  }

  async function runSearch(opts: { query: string; caseSensitive: boolean; scope: string }) {
    const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    searchSessionRef.current = sessionId;
    setSearchBusy(true);
    setLastSearch({ query: opts.query, caseSensitive: opts.caseSensitive, response: null });
    setBottomPanel({ open: true, activeTab: 'search' });
    const scopes = opts.scope === 'all'
      ? state.openedFolders.filter((f) => !f.isVirtual).map((f) => f.hostPath)
      : state.openedFolders.filter((f) => f.id === opts.scope && !f.isVirtual).map((f) => f.hostPath);
    try {
      const response = await getApi().fs.search({
        query: opts.query,
        caseSensitive: opts.caseSensitive,
        scopes,
        maxMatches: 1000,
        sessionId,
      });
      if (searchSessionRef.current === sessionId) {
        setLastSearch({ query: opts.query, caseSensitive: opts.caseSensitive, response });
      }
    } finally {
      setSearchBusy(false);
    }
  }

  function handleRerunSearch() {
    if (!lastSearch.query) return;
    void runSearch({ query: lastSearch.query, caseSensitive: lastSearch.caseSensitive, scope: 'all' });
  }

  function handleOpenSearchResult(a: OpenResultArg) {
    pickFile(a.folderId, a.relativePath);
    setActiveHighlight({ query: a.query, caseSensitive: a.caseSensitive, matchOrdinal: a.matchOrdinal });
    revealFile(a.folderId, a.relativePath);
  }

  if (!hydrated) return <div className="p-8 text-sm text-muted">Loading…</div>;

  const activeFileForSidebar = activeTab
    ? { folderId: activeTab.folderId, relativePath: activeTab.relativePath }
    : null;

  const ViewToggles = (
    <div className="flex items-center gap-1 text-xs">
      <ToggleChip on={viewFlags.sidebar} onClick={() => toggleView('sidebar')} label="Sidebar" />
      <ToggleChip on={viewFlags.tabBar} onClick={() => toggleView('tabBar')} label="Tabs" />
      <ToggleChip on={viewFlags.git} onClick={() => toggleView('git')} label="Git" />
      <ToggleChip
        on={bottomPanel.open}
        onClick={() => setBottomPanel((p) => ({ ...p, open: !p.open }))}
        label="Panel"
      />
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="titlebar-drag flex h-10 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" aria-hidden className="h-5 w-5 shrink-0" />
          <h1 className="text-sm font-semibold tracking-wide text-fg">PAX Reader</h1>
          <ModeSwitcher mode={mode} onChange={changeMode} />
        </div>
        <div className="flex items-center gap-4">
          {updateReady && (
            <button
              type="button"
              onClick={() => { void getApi().update.install(); }}
              title={`Restart now to update to v${updateReady}`}
              className="flex shrink-0 items-center gap-1 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent hover:text-accent-fg"
            >
              ⟳ Update ready — restart
            </button>
          )}
          {mode !== 'terminal' && ViewToggles}
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30"
            disabled={state.openedFolders.length === 0 && state.openTabs.length === 0}
          >
            Clear all
          </button>
          <ThemeToggle theme={state.theme} favorites={state.themeFavorites} onChange={setTheme} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open appearance settings"
            className="rounded-theme p-2 text-muted hover:bg-surface-2"
          >
            ⚙️
          </button>
          {hasApi() && <WindowControls />}
        </div>
      </header>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={state.theme}
        favorites={state.themeFavorites}
        onSelectTheme={setTheme}
        onSetFavorites={setFavorites}
        settings={appSettings}
        onUpdateSettings={updateSettings}
        customFonts={customFonts}
        onCustomFontsChanged={setCustomFonts}
        onResetDefaults={resetDefaults}
      />

      {bridgeMissing && (
        <div className="bg-amber-100 px-4 py-1 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          Electron bridge not detected — running in a plain browser. Filesystem and terminal features are unavailable.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <PanelGroup direction="horizontal" autoSaveId={`mdreader.layout.h.v4.${getWindowContext().windowId}`} className="!flex-1">
          <Panel
            ref={sidebarPanelRef}
            defaultSize={20}
            minSize={15}
            maxSize={40}
            collapsible
            collapsedSize={0}
            className="overflow-hidden"
            onCollapse={() => {
              const next = flagFromPanelEvent('collapse', modeRef.current);
              if (next !== null) setViewFlags((f) => (f.sidebar === next ? f : { ...f, sidebar: next }));
            }}
            onExpand={() => {
              const next = flagFromPanelEvent('expand', modeRef.current);
              if (next !== null) setViewFlags((f) => (f.sidebar === next ? f : { ...f, sidebar: next }));
            }}
          >
            <Sidebar
              folders={state.openedFolders}
              activeFile={activeFileForSidebar}
              markdownOnly={mode === 'md'}
              menuAutoHide={appSettings?.contextMenuAutoHide ?? true}
              gitPanel={
                <GitPanel
                  repos={gitRepos}
                  activeRoot={activeRepoRoot}
                  onSelectRepo={setActiveRepoRoot}
                  onOpenDiff={openDiffTab}
                  active={viewFlags.git}
                />
              }
              gitVisible={viewFlags.git}
              onGitVisibilityChange={(visible) => {
                const next = flagFromPanelEvent(visible ? 'expand' : 'collapse', modeRef.current);
                if (next !== null) setViewFlags((f) => (f.git === next ? f : { ...f, git: next }));
              }}
              onPickFile={pickFile}
              onCloseFolder={closeFolder}
              onOpenFolderClick={() => setPickerOpen(true)}
              onDropFolder={onDropFolder}
              onCopyFolderPath={(hostPath) => {
                void navigator.clipboard.writeText(hostPath).then(
                  () => showToast('Folder path copied'),
                  () => showToast('Copy failed'),
                );
              }}
              onDropFolderOnTerminal={dropFolderOnTerminal}
            />
          </Panel>
          <PanelResizeHandle
            className="w-1.5 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-accent"
            style={{ display: viewFlags.sidebar && mode !== 'terminal' ? 'block' : 'none' }}
          />
          <Panel defaultSize={80} minSize={30} className="overflow-hidden">
            <PanelGroup direction="vertical" autoSaveId={`mdreader.layout.v.v3.${getWindowContext().windowId}`}>
              <Panel ref={topContentPanelRef} defaultSize={65} minSize={25} collapsible collapsedSize={0} className="overflow-hidden">
                <main className="relative flex h-full min-w-0 flex-col bg-bg" data-zoom-zone>
                  {modeSwitching && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-bg/60 backdrop-blur-[1px]">
                      <svg className="h-6 w-6 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                  {viewFlags.tabBar && (
                    <TabBar
                      tabs={visibleTabViews}
                      menuAutoHide={appSettings?.contextMenuAutoHide ?? true}
                      onFocus={(t) => focusTab(t.folderId, t.relativePath)}
                      onClose={(t) => closeTab(t.folderId, t.relativePath)}
                      onCopyPath={copyTabPath}
                      onCloseOthers={(t) => closeOtherTabs(t.folderId, t.relativePath)}
                      onCloseAll={closeAllTabs}
                      onTogglePin={togglePin}
                      onTearOff={tearOffTab}
                      onCopyFolderPath={copyTabFolderPath}
                      onDropOnTerminal={dropTabOnTerminal}
                    />
                  )}
                  <div className="flex-1 overflow-y-auto">
                    {state.openedFolders.length === 0 ? (
                      <EmptyState onOpenFolder={() => setPickerOpen(true)} />
                    ) : activeTab && activeTab.kind === 'diff' ? (
                      <DiffView
                        unified={virtualContents[`${activeTab.folderId}::${activeTab.relativePath}`] ?? ''}
                        title={diffTitles[`${activeTab.folderId}::${activeTab.relativePath}`] ?? activeTab.relativePath}
                      />
                    ) : activeTab ? (
                      <>
                        <div className="h-full" hidden={mode !== 'md'}>
                          {isMermaidPath(activeTab.relativePath) ? (
                            <DiagramView
                              source={(() => {
                                const p = activeAbsPath();
                                const b = p ? contentStoreRef.current.get(p) : undefined;
                                return b !== undefined ? b : content;
                              })()}
                              theme={state.theme}
                            />
                          ) : (
                            <MarkdownView
                              content={(() => {
                                const p = activeAbsPath();
                                const b = p ? contentStoreRef.current.get(p) : undefined;
                                return b !== undefined ? b : content;
                              })()}
                              theme={state.theme}
                              onOpenMermaidInNewTab={openMermaidInNewTab}
                              findBarOpen={findBarOpenForActive}
                              onFindBarOpenChange={setFindBarOpenForActive}
                              activeHighlight={activeHighlight}
                              fontFamily={readingFontFamily}
                            />
                          )}
                        </div>
                        <div className="h-full" hidden={mode !== 'code'}>
                          {(() => {
                            const p = activeAbsPath();
                            if (!p) {
                              return (
                                <div className="flex h-full items-center justify-center text-sm text-muted">
                                  This file can&apos;t be edited (virtual or dropped).
                                </div>
                              );
                            }
                            // Wait for the file content to load before mounting the editor,
                            // otherwise it seeds an empty document that never updates.
                            const val = contentStoreRef.current.get(p);
                            if (val === undefined) {
                              return <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>;
                            }
                            const editor = (
                              <CodeEditor
                                key={`${p}:${fileRevisions[p] ?? 0}`}
                                path={p}
                                value={val}
                                theme={themeMode(state.theme)}
                                onChange={handleEditorChange}
                                onSave={handleEditorSave}
                              />
                            );
                            const isHtml = /\.html?$/i.test(p);
                            if (!isHtml) return editor;
                            // HTML files get a Source/Preview toggle. Preview renders the live
                            // buffer in a sandboxed iframe (scripts isolated from the app).
                            return (
                              <div className="flex h-full flex-col">
                                <div className="flex items-center gap-1 border-b border-border bg-surface px-2 py-1 text-xs">
                                  <ToggleChip on={!htmlPreview} onClick={() => setHtmlPreview(false)} label="Source" />
                                  <ToggleChip on={htmlPreview} onClick={() => setHtmlPreview(true)} label="Preview" />
                                </div>
                                <div className="relative min-h-0 flex-1">
                                  <div className="h-full" hidden={htmlPreview}>{editor}</div>
                                  {htmlPreview && (
                                    <iframe
                                      title="HTML preview"
                                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                                      srcDoc={val}
                                      className="h-full w-full border-0 bg-white"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">
                        Select a markdown file from the sidebar
                      </div>
                    )}
                  </div>
                  <StatusStrip
                    hostPath={activeHostPath}
                    hasActiveHighlight={activeHighlight !== null}
                    onClearHighlight={() => {
                      setActiveHighlight(null);
                      setFindBarOpenForActive(false);
                    }}
                  />
                </main>
              </Panel>
              <PanelResizeHandle
                className="h-1.5 shrink-0 cursor-row-resize bg-border transition-colors hover:bg-accent"
                style={{ display: bottomPanel.open ? 'block' : 'none' }}
              />
              <Panel
                ref={bottomPanelRef}
                defaultSize={35}
                minSize={10}
                collapsible
                collapsedSize={0}
                className="overflow-hidden"
                onCollapse={() => {
                  const next = flagFromPanelEvent('collapse', modeRef.current);
                  if (next !== null) setBottomPanel((p) => (p.open === next ? p : { ...p, open: next }));
                }}
                onExpand={() => {
                  const next = flagFromPanelEvent('expand', modeRef.current);
                  if (next !== null) setBottomPanel((p) => (p.open === next ? p : { ...p, open: next }));
                }}
              >
                <BottomPanel
                  activeTab={bottomPanel.activeTab}
                  showHeader={mode !== 'terminal'}
                  onActiveTabChange={(id) => setBottomPanel((p) => ({ ...p, activeTab: id, open: true }))}
                  onCollapse={() => setBottomPanel((p) => ({ ...p, open: false }))}
                  terminal={
                    terminalShownOnce ? (
                      <TerminalPanel
                        theme={state.theme}
                        visible={bottomPanel.open && bottomPanel.activeTab === 'terminal'}
                        contentZoom={appSettings?.contentZoom ?? 100}
                        onReady={(h) => { terminalHandleRef.current = h; }}
                      />
                    ) : null
                  }
                  search={
                    <SearchPanel
                      query={lastSearch.query}
                      caseSensitive={lastSearch.caseSensitive}
                      response={lastSearch.response}
                      folders={state.openedFolders}
                      onOpenResult={handleOpenSearchResult}
                      onRerun={handleRerunSearch}
                      onClear={() => setLastSearch({ query: '', caseSensitive: false, response: null })}
                      busy={searchBusy}
                    />
                  }
                />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <FolderPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={openFolder}
        recentFolders={state.recentFolders}
      />

      <SearchModal
        open={searchModalOpen}
        folders={state.openedFolders.filter((f) => !f.isVirtual)}
        busy={searchBusy}
        onClose={() => {
          if (searchSessionRef.current) {
            try { getApi().fs.searchCancel(searchSessionRef.current); } catch {}
          }
          setSearchModalOpen(false);
        }}
        onSearch={(s) => {
          setSearchModalOpen(false);
          void runSearch({ query: s.query, caseSensitive: s.caseSensitive, scope: s.scope });
        }}
      />

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmClear(false)}>
          <div
            className="w-full max-w-sm rounded-xl bg-surface p-5 text-fg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold text-fg">Clear all?</h3>
            <p className="mb-4 text-sm text-muted">
              Closes every opened folder and tab, including dropped folders. Theme and view settings are kept.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-fg px-4 py-1.5 text-xs text-bg shadow">
          {toast}
        </div>
      )}
    </div>
  );
}

/** macOS-style traffic-light window controls for the frameless window.
 *  Glyphs appear on hover of the group, like macOS. Close stays in the
 *  top-right corner (Windows muscle memory); colors follow macOS. */
function WindowControls() {
  // .window-control / .wc-* let the cartoon themes restyle these to the
  // neobrutalist house palette (see globals.css).
  const btn = 'window-control flex h-3.5 w-3.5 items-center justify-center rounded-full text-[0px] font-bold leading-none text-black/60 ring-1 ring-black/15 transition-colors group-hover:text-[0.5625rem]';
  return (
    <div className="group titlebar-no-drag ml-1 flex shrink-0 items-center gap-2" aria-label="Window controls">
      <button
        type="button"
        aria-label="Minimize window"
        onClick={() => { void getApi().window.minimize(); }}
        className={`${btn} wc-min bg-[#FEBC2E]`}
      >
        −
      </button>
      <button
        type="button"
        aria-label="Maximize or restore window"
        onClick={() => { void getApi().window.maximizeToggle(); }}
        className={`${btn} wc-max bg-[#28C840]`}
      >
        +
      </button>
      <button
        type="button"
        aria-label="Close window"
        onClick={() => { void getApi().window.close(); }}
        className={`${btn} wc-close bg-[#FF5F57]`}
      >
        ✕
      </button>
    </div>
  );
}

function ToggleChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={[
        'rounded border px-2 py-0.5 transition-colors',
        on
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border text-muted hover:bg-surface-2',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function activateLastIfNoActive(tabs: AppState['openTabs']): AppState['openTabs'] {
  if (tabs.length === 0) return tabs;
  if (tabs.some((t) => t.active)) return tabs;
  return tabs.map((t, i) => ({ ...t, active: i === tabs.length - 1 }));
}
