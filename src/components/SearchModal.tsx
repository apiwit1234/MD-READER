'use client';
import { useEffect, useRef, useState } from 'react';
import type { OpenedFolder, SearchScope } from '@/types';
import { loadSearchState, saveSearchState } from '@/lib/storage';
import { pushHistory } from '@/lib/search-store';

type SearchSubmit = {
  query: string;
  caseSensitive: boolean;
  scope: SearchScope;
};

type Props = {
  open: boolean;
  folders: OpenedFolder[];
  onClose: () => void;
  onSearch: (s: SearchSubmit) => void;
  busy?: boolean;
};

export function SearchModal({ open, folders, onClose, onSearch, busy = false }: Props) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [scope, setScope] = useState<SearchScope>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const s = loadSearchState();
    setQuery(s.lastQuery);
    setCaseSensitive(s.caseSensitive);
    const stillOpen = s.lastScope === 'all' || folders.some((f) => f.id === s.lastScope);
    setScope(stillOpen ? s.lastScope : 'all');
    setHistory(s.history);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, folders]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    if (!query) return;
    saveSearchState({ lastQuery: query, caseSensitive, lastScope: scope, history });
    pushHistory(query);
    onSearch({ query, caseSensitive, scope });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 pt-24" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] rounded-md border border-border bg-surface text-fg shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium">Search</span>
          <button type="button" onClick={onClose} aria-label="Close search" className="text-muted hover:text-fg">✕</button>
        </div>
        <div className="space-y-3 p-4">
          <div className="relative">
            <label className="mb-1 block text-xs text-muted">Query</label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 100)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && !query) { e.preventDefault(); setShowHistory(true); }
                  if (e.key === 'Enter') { e.preventDefault(); submit(); }
                }}
                placeholder="Search query"
                className="flex-1 rounded border border-border bg-surface-2 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => setCaseSensitive((v) => !v)}
                aria-label="Toggle case sensitive"
                className={`rounded px-2 py-1 text-xs ${caseSensitive ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'}`}
              >Aa</button>
            </div>
            {showHistory && history.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded border border-border bg-surface shadow">
                {history.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setQuery(q); setShowHistory(false); }}
                      className="block w-full px-3 py-1 text-left text-xs hover:bg-surface-2"
                    >{q}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as SearchScope)}
              className="w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm"
            >
              <option value="all">All opened folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>● {f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1 text-sm text-muted hover:bg-surface-2">Cancel</button>
          <button
            type="button"
            disabled={!query || busy}
            onClick={submit}
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-accent-fg hover:bg-accent/90 disabled:bg-surface-2 disabled:text-muted"
          >
            {busy ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
