import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, defaultState, STORAGE_KEY } from './storage';
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
    s.themeFavorites = ['retro', 'space'];
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

  it('accepts all five themes', () => {
    for (const theme of ['light', 'dark', 'retro', 'space', 'moneh'] as const) {
      const s = defaultState();
      s.theme = theme;
      saveState(s);
      expect(loadState().theme).toBe(theme);
    }
  });

  it('rejects an unknown theme and returns defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'neon', openedFolders: [], openTabs: [], recentFolders: [], themeFavorites: ['light', 'dark'] }),
    );
    expect(loadState()).toEqual(defaultState());
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
