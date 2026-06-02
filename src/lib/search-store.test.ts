import { describe, it, expect, beforeEach } from 'vitest';
import { pushHistory, MAX_HISTORY } from './search-store';
import { saveSearchState, loadSearchState } from './storage';
import { DEFAULT_SEARCH_STATE } from '@/types';

describe('search-store', () => {
  beforeEach(() => localStorage.clear());

  it('pushes a new entry to the front', () => {
    pushHistory('docker');
    expect(loadSearchState().history).toEqual(['docker']);
  });

  it('dedupes (most-recent wins)', () => {
    saveSearchState({ ...DEFAULT_SEARCH_STATE, history: ['a', 'b'] });
    pushHistory('a');
    expect(loadSearchState().history).toEqual(['a', 'b']);
  });

  it('caps at MAX_HISTORY', () => {
    const long = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => `q${i}`);
    saveSearchState({ ...DEFAULT_SEARCH_STATE, history: long });
    pushHistory('newest');
    const h = loadSearchState().history;
    expect(h[0]).toBe('newest');
    expect(h.length).toBe(MAX_HISTORY);
  });

  it('ignores empty queries', () => {
    pushHistory('');
    expect(loadSearchState().history).toEqual([]);
  });
});
