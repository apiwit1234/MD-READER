import type { BrowseResponse, FsNode, OpenedFolder, OpenTab, ReadResponse, SearchOpts, SearchResponse } from '@/types';

type TermSpawnOpts = { cols?: number; rows?: number; cwd?: string; shell?: string };
type TermSpawnResult = { ok: true; id: number } | { ok: false; error: string };

export type SpawnWindowInitial = {
  folder: OpenedFolder;
  tab: OpenTab;
  // Single-tab content for mermaid synthetic tabs. For dropped-folder tabs,
  // all of the folder's virtualContents come through `folderContents` instead.
  content?: string;
  // For virtual (drag-dropped) folders, the entire content map keyed by
  // `${folderId}::${relativePath}`. Allows other tabs in the same folder to
  // be opened in the spawned window.
  folderContents?: Record<string, string>;
};

type SpawnWindowOpts = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  initial?: SpawnWindowInitial;
};

export type UiSize = 'small' | 'medium' | 'large';

export type CustomFont = { id: string; label: string };

export type AppSettings = {
  autoUpdate: boolean;
  uiSize: UiSize;
  contentZoom: number;
  contextMenuAutoHide: boolean;
  fontSource: string;
  fontSplit: boolean;
  fontEnglish: string;
  fontThai: string;
};

export type GitResult = { ok: boolean; code: number; stdout: string; stderr: string };
export type GitDetect = { isRepo: boolean; root: string | null; branch: string | null };

type MdReader = {
  fs: {
    tree: (absPath: string) => Promise<FsNode>;
    browse: (absPath: string) => Promise<BrowseResponse>;
    read: (absPath: string) => Promise<ReadResponse>;
    write: (absPath: string, content: string, roots: string[]) => Promise<{ ok: true } | { ok: false; error: string }>;
    pickDirectory: () => Promise<string | null>;
    homeDir: () => Promise<string>;
    search: (opts: SearchOpts) => Promise<SearchResponse>;
    searchCancel: (sessionId: string) => void;
    watch: (absPath: string) => Promise<boolean>;
    unwatch: (absPath: string) => Promise<void>;
    onChanged: (cb: (root: string) => void) => () => void;
  };
  term: {
    spawn: (opts: TermSpawnOpts) => Promise<TermSpawnResult>;
    write: (id: number, data: string) => Promise<boolean>;
    resize: (id: number, cols: number, rows: number) => Promise<boolean>;
    kill: (id: number) => Promise<boolean>;
    onData: (id: number, cb: (data: string) => void) => () => void;
    onExit: (id: number, cb: (code: number) => void) => () => void;
  };
  app: {
    onOpenFile: (cb: (filePath: string) => void) => () => void;
    onInitialState: (cb: (initial: SpawnWindowInitial) => void) => () => void;
    logError: (scope: string, message: string) => Promise<string>;
    openLog: () => Promise<string>;
    logPath: () => Promise<string>;
    versionInfo: () => Promise<{ current: string; updatedFrom: string | null }>;
  };
  git: {
    detect: (folderPath: string) => Promise<GitDetect>;
    status: (root: string) => Promise<GitResult>;
    branches: (root: string) => Promise<GitResult>;
    diff: (root: string, path: string, staged: boolean) => Promise<GitResult>;
    stage: (root: string, paths: string[]) => Promise<GitResult>;
    unstage: (root: string, paths: string[]) => Promise<GitResult>;
    discard: (root: string, paths: string[]) => Promise<GitResult>;
    commit: (root: string, message: string) => Promise<GitResult>;
    checkout: (root: string, branch: string) => Promise<GitResult>;
    createBranch: (root: string, name: string, from?: string) => Promise<GitResult>;
    merge: (root: string, branch: string) => Promise<GitResult>;
    fetch: (root: string) => Promise<GitResult>;
    pull: (root: string) => Promise<GitResult>;
    push: (root: string) => Promise<GitResult>;
    sync: (root: string) => Promise<GitResult>;
  };
  window: {
    spawn: (opts: SpawnWindowOpts) => Promise<string>;
    setTitleBarColors: (color: string) => Promise<boolean>;
    minimize: () => Promise<boolean>;
    maximizeToggle: () => Promise<boolean>;
    close: () => Promise<boolean>;
  };
  clipboard: {
    saveImage: () => Promise<string | null>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    reset: () => Promise<AppSettings>;
  };
  fonts: {
    list: () => Promise<CustomFont[]>;
    add: () => Promise<{ ok: boolean; font?: CustomFont; error?: string | null }>;
    remove: (id: string) => Promise<{ ok: boolean }>;
    data: (id: string) => Promise<{ ok: boolean; bytes?: Uint8Array; format?: string; error?: string }>;
  };
  update: {
    check: () => Promise<{ ok: boolean; version?: string | null; error?: string }>;
    install: () => Promise<boolean>;
    onUpdateReady: (cb: (version: string) => void) => () => void;
  };
  fileUtil: {
    pathForFile: (file: File) => string | null;
  };
};

declare global {
  // eslint-disable-next-line no-var
  var mdreader: MdReader | undefined;
  interface Window {
    mdreader?: MdReader;
  }
}

export function getApi(): MdReader {
  if (typeof window === 'undefined' || !window.mdreader) {
    throw new Error('Electron bridge not available — this build must run inside Electron.');
  }
  return window.mdreader;
}

export function hasApi(): boolean {
  return typeof window !== 'undefined' && !!window.mdreader;
}
