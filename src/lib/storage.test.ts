import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, defaultState, clearedState, STORAGE_KEY } from './storage';
import type { AppState } from '@/types';
import {
  loadSearchState,
  saveSearchState,
  loadBottomPanelState,
  saveBottomPanelState,
  loadMode,
  saveMode,
} from './storage';
import { DEFAULT_SEARCH_STATE, DEFAULT_BOTTOM_PANEL_STATE } from '@/types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing stored', () => {
    expect(loadState()).toEqual(defaultState());
  });

  it('round-trips state', () => {
    const s = defaultState();
    s.theme = 'dark';
    s.themeFavorites = ['cartoon-light', 'dark'];
    s.openedFolders.push({
      id: 'abc',
      hostPath: 'C:\\x',
      name: 'x',
      color: '#2563eb',
      expanded: true,
    });
    saveState(s);
    expect(loadState()).toEqual(s);
  });

  it('returns defaults on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState()).toEqual(defaultState());
  });

  it('returns defaults on missing required fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'light' }));
    expect(loadState()).toEqual(defaultState());
  });

  it('accepts all four themes', () => {
    for (const theme of ['light', 'dark', 'cartoon-light', 'cartoon-dark'] as const) {
      const s = defaultState();
      s.theme = theme;
      saveState(s);
      expect(loadState().theme).toBe(theme);
    }
  });

  it('migrates removed themes by base WITHOUT resetting the rest of the state', () => {
    const folders = [{ id: 'abc', hostPath: 'C:\\x', name: 'x', color: '#2563eb', expanded: true }];
    for (const [legacy, expected] of [['space', 'dark'], ['retro', 'light'], ['moneh', 'light']] as const) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ theme: legacy, openedFolders: folders, openTabs: [], recentFolders: [], themeFavorites: ['light', 'dark'] }),
      );
      const loaded = loadState();
      expect(loaded.theme).toBe(expected);
      expect(loaded.openedFolders).toEqual(folders);
    }
  });

  it('migrates removed themes inside favorites, resetting to defaults on a collision', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'light', openedFolders: [], openTabs: [], recentFolders: [], themeFavorites: ['retro', 'space'] }),
    );
    expect(loadState().themeFavorites).toEqual(['light', 'dark']); // retro->light, space->dark

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'light', openedFolders: [], openTabs: [], recentFolders: [], themeFavorites: ['retro', 'moneh'] }),
    );
    // both map to light -> collision -> default pair
    expect(loadState().themeFavorites).toEqual(['light', 'dark']);
  });

  it('falls back to light theme on a completely unknown value (keeping state)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'neon', openedFolders: [], openTabs: [], recentFolders: [], themeFavorites: ['light', 'dark'] }),
    );
    expect(loadState().theme).toBe('light');
  });

  it('fills missing themeFavorites with the default pair (v2 migration)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'dark', openedFolders: [], openTabs: [], recentFolders: [] }),
    );
    const loaded = loadState();
    expect(loaded.theme).toBe('dark');
    expect(loaded.themeFavorites).toEqual(['light', 'dark']);
  });

  it('repairs themeFavorites containing an invalid member', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'light', openedFolders: [], openTabs: [], recentFolders: [], themeFavorites: ['light', 'neon'] }),
    );
    expect(loadState().themeFavorites).toEqual(['light', 'dark']);
  });

  it('defaultState favorites are [light, dark]', () => {
    expect(defaultState().themeFavorites).toEqual(['light', 'dark']);
  });

});

describe('search state storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing stored', () => {
    expect(loadSearchState()).toEqual(DEFAULT_SEARCH_STATE);
  });

  it('round-trips a saved state', () => {
    saveSearchState({
      lastQuery: 'docker',
      caseSensitive: true,
      lastScope: 'folder-id-abc',
      history: ['docker', 'compose'],
    });
    expect(loadSearchState()).toEqual({
      lastQuery: 'docker',
      caseSensitive: true,
      lastScope: 'folder-id-abc',
      history: ['docker', 'compose'],
    });
  });

  it('returns defaults on corrupted JSON', () => {
    const base = 'mdreader.search.v1';
    localStorage.setItem(base, 'not json');
    const result = loadSearchState();
    expect(result).toEqual(DEFAULT_SEARCH_STATE);
  });
});

describe('bottom panel storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing stored', () => {
    expect(loadBottomPanelState()).toEqual(DEFAULT_BOTTOM_PANEL_STATE);
  });

  it('round-trips a saved state', () => {
    saveBottomPanelState({ activeTab: 'search', open: true });
    expect(loadBottomPanelState()).toEqual({ activeTab: 'search', open: true });
  });
});

describe('mode persistence', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to md when nothing stored', () => {
    expect(loadMode()).toBe('md');
  });

  it('round-trips a saved mode', () => {
    saveMode('code');
    expect(loadMode()).toBe('code');
  });

  it('falls back to md on an invalid stored value', () => {
    localStorage.setItem('mdreader.mode.v1.main', JSON.stringify('bogus'));
    expect(loadMode()).toBe('md');
  });
});

describe('clearedState', () => {
  it('clears folders and tabs but keeps theme, favorites and recents', () => {
    const prev: AppState = {
      theme: 'dark',
      themeFavorites: ['dark', 'cartoon-light'],
      openedFolders: [{ id: 'f1', hostPath: 'C:/docs', name: 'docs', color: '#f00', expanded: true }],
      openTabs: [{ folderId: 'f1', relativePath: 'a.md', active: true }],
      recentFolders: [{ hostPath: 'C:/docs', lastOpenedAt: 123 }],
    };
    const next = clearedState(prev);
    expect(next.openedFolders).toEqual([]);
    expect(next.openTabs).toEqual([]);
    expect(next.theme).toBe('dark');
    expect(next.themeFavorites).toEqual(['dark', 'cartoon-light']);
    expect(next.recentFolders).toEqual([{ hostPath: 'C:/docs', lastOpenedAt: 123 }]);
  });

  it('does not mutate the previous state', () => {
    const prev: AppState = {
      theme: 'light',
      themeFavorites: ['light', 'dark'],
      openedFolders: [{ id: 'f1', hostPath: 'C:/x', name: 'x', color: '#0f0', expanded: false }],
      openTabs: [],
      recentFolders: [],
    };
    clearedState(prev);
    expect(prev.openedFolders).toHaveLength(1);
  });
});
