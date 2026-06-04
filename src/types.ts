export type { Theme } from '@/lib/themes';
import type { Theme } from '@/lib/themes';

export type FsNode = {
  name: string;
  type: 'dir' | 'file';
  relativePath: string;
  children?: FsNode[];
};

export type OpenedFolder = {
  id: string;
  hostPath: string;
  name: string;
  color: string;
  expanded: boolean;
  isVirtual?: boolean;
  virtualTree?: FsNode;
};

export type OpenTab = {
  folderId: string;
  relativePath: string;
  active: boolean;
  pinned?: boolean;
  kind?: 'file' | 'mermaid' | 'diff';
  // For 'mermaid' tabs the content is the mermaid source kept in-memory.
  // For 'diff' tabs the unified-diff text is kept in virtualContents.
};

export type RecentFolder = {
  hostPath: string;
  lastOpenedAt: number;
};

export type AppState = {
  theme: Theme;
  themeFavorites: [Theme, Theme];
  openedFolders: OpenedFolder[];
  openTabs: OpenTab[];
  recentFolders: RecentFolder[];
  /** Folder auto-opened on launch (Settings → Startup). Null = disabled. */
  defaultFolder: string | null;
};

export type BrowseEntry = { name: string; type: 'dir' };

export type BrowseResponse = {
  entries: BrowseEntry[];
  breadcrumbs: { name: string; path: string }[];
  currentPath: string;
};

export type ReadResponse = { content: string; hostPath: string };
export type HostPathResponse = { hostPath: string };

// --- Search ---
export type SearchScope = 'all' | string; // 'all' or an OpenedFolder.id

export type SearchMatch = {
  line: number;     // 1-based
  column: number;   // 0-based
  lineText: string; // truncated snippet, codepoint-safe, may include leading/trailing …
};

export type SearchFileResult = {
  hostPath: string;
  matches: SearchMatch[];
};

export type SearchOpts = {
  query: string;
  caseSensitive: boolean;
  scopes: string[];   // absolute host paths from OpenedFolder.hostPath
  maxMatches: number; // 1..5000, clamped by main process
  sessionId: string;  // for cancellation
};

export type SearchResponse = {
  files: SearchFileResult[];
  totalMatches: number;
  truncated: boolean;
  cancelled: boolean;
  scannedFiles: number;
  elapsedMs: number;
};

export type SearchState = {
  lastQuery: string;
  caseSensitive: boolean;
  lastScope: SearchScope;
  history: string[];   // most-recent first, max 10
};

export const DEFAULT_SEARCH_STATE: SearchState = {
  lastQuery: '',
  caseSensitive: false,
  lastScope: 'all',
  history: [],
};

// --- Bottom panel ---
export type BottomTabId = 'terminal' | 'search';

export type BottomPanelState = {
  activeTab: BottomTabId;
  open: boolean;
};

export const DEFAULT_BOTTOM_PANEL_STATE: BottomPanelState = {
  activeTab: 'terminal',
  open: false,
};

// --- Git ---
export type GitFileStatus = {
  path: string;
  index: string;        // staged status char (porcelain XY, X)
  workingTree: string;  // unstaged status char (porcelain XY, Y)
  conflicted: boolean;
  origPath?: string;    // for renames/copies
};

export type GitStatus = {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
};

export type GitBranches = { current: string | null; local: string[]; remote: string[] };

export type GitRepo = { folderId: string; root: string; name: string };
