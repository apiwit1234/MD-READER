import { loadSearchState, saveSearchState } from './storage';

export const MAX_HISTORY = 10;

export function pushHistory(query: string): void {
  if (!query) return;
  const state = loadSearchState();
  const filtered = state.history.filter((q) => q !== query);
  const next = [query, ...filtered].slice(0, MAX_HISTORY);
  saveSearchState({ ...state, history: next });
}
