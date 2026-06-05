import type { AppState, SearchState, BottomPanelState } from '@/types';
import { DEFAULT_SEARCH_STATE, DEFAULT_BOTTOM_PANEL_STATE } from '@/types';
import { migrateTheme, type Theme } from './themes';
import { isMode, type Mode } from './mode';
import { withWindowSuffix } from './window-context';

export const STORAGE_KEY_BASE = 'mdreader.state.v2';
// STORAGE_KEY is computed per-window so multiple windows don't trample each other's state.
export const STORAGE_KEY = (typeof window !== 'undefined') ? withWindowSuffix(STORAGE_KEY_BASE) : STORAGE_KEY_BASE;

const DEFAULT_FAVORITES: [Theme, Theme] = ['light', 'dark'];

export function defaultState(): AppState {
  return {
    theme: 'light',
    themeFavorites: [...DEFAULT_FAVORITES],
    openedFolders: [],
    openTabs: [],
    recentFolders: [],
  };
}

/** Clear-all: drop workspace content but PRESERVE user preferences
 *  (theme, favorites, recent folders). Fixes the v1.0.4 bug where Clear all
 *  silently reset the theme to light. */
export function clearedState(prev: AppState): AppState {
  return { ...prev, openedFolders: [], openTabs: [] };
}

function normalizeFavorites(x: unknown): [Theme, Theme] {
  if (Array.isArray(x) && x.length === 2) {
    const a = migrateTheme(x[0]);
    const b = migrateTheme(x[1]);
    // Reject pairs that didn't start as themes at all, and post-migration collisions.
    const bothWereThemeLike = typeof x[0] === 'string' && typeof x[1] === 'string';
    if (bothWereThemeLike && a !== b) return [a, b];
  }
  return [...DEFAULT_FAVORITES];
}

function isValidState(x: unknown): x is Record<string, unknown> {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.theme === 'string' &&
    Array.isArray(s.openedFolders) &&
    Array.isArray(s.openTabs) &&
    Array.isArray(s.recentFolders)
  );
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return defaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return defaultState();
    return {
      theme: migrateTheme(parsed.theme),
      themeFavorites: normalizeFavorites(parsed.themeFavorites),
      openedFolders: parsed.openedFolders as AppState['openedFolders'],
      openTabs: parsed.openTabs as AppState['openTabs'],
      recentFolders: parsed.recentFolders as AppState['recentFolders'],
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Search State Storage ---

const SEARCH_KEY_BASE = 'mdreader.search.v1';
const BOTTOM_PANEL_KEY_BASE = 'mdreader.bottomPanel.v1';

function searchKey() {
  return typeof window !== 'undefined' ? withWindowSuffix(SEARCH_KEY_BASE) : SEARCH_KEY_BASE;
}

function bottomPanelKey() {
  return typeof window !== 'undefined' ? withWindowSuffix(BOTTOM_PANEL_KEY_BASE) : BOTTOM_PANEL_KEY_BASE;
}

function isValidSearchState(x: unknown): x is SearchState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.lastQuery === 'string' &&
    typeof s.caseSensitive === 'boolean' &&
    (s.lastScope === 'all' || typeof s.lastScope === 'string') &&
    Array.isArray(s.history) &&
    s.history.every((q) => typeof q === 'string')
  );
}

function isValidBottomPanelState(x: unknown): x is BottomPanelState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    (s.activeTab === 'terminal' || s.activeTab === 'search') &&
    typeof s.open === 'boolean'
  );
}

export function loadSearchState(): SearchState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SEARCH_STATE };
  const raw = localStorage.getItem(searchKey());
  if (!raw) return { ...DEFAULT_SEARCH_STATE };
  try {
    const parsed = JSON.parse(raw);
    return isValidSearchState(parsed) ? parsed : { ...DEFAULT_SEARCH_STATE };
  } catch {
    return { ...DEFAULT_SEARCH_STATE };
  }
}

export function saveSearchState(state: SearchState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(searchKey(), JSON.stringify(state));
}

export function loadBottomPanelState(): BottomPanelState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_BOTTOM_PANEL_STATE };
  const raw = localStorage.getItem(bottomPanelKey());
  if (!raw) return { ...DEFAULT_BOTTOM_PANEL_STATE };
  try {
    const parsed = JSON.parse(raw);
    return isValidBottomPanelState(parsed) ? parsed : { ...DEFAULT_BOTTOM_PANEL_STATE };
  } catch {
    return { ...DEFAULT_BOTTOM_PANEL_STATE };
  }
}

export function saveBottomPanelState(state: BottomPanelState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(bottomPanelKey(), JSON.stringify(state));
}

// --- Mode Storage ---

const MODE_KEY_BASE = 'mdreader.mode.v1';

function modeKey() {
  return typeof window !== 'undefined' ? withWindowSuffix(MODE_KEY_BASE) : MODE_KEY_BASE;
}

export function loadMode(): Mode {
  if (typeof localStorage === 'undefined') return 'md';
  const raw = localStorage.getItem(modeKey());
  if (!raw) return 'md';
  try {
    const parsed = JSON.parse(raw);
    return isMode(parsed) ? parsed : 'md';
  } catch {
    return 'md';
  }
}

export function saveMode(mode: Mode): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(modeKey(), JSON.stringify(mode));
}
