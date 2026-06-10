'use client';
import { useMemo, useState } from 'react';
import type { OpenedFolder, SearchResponse } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type OpenResultArg = {
  folderId: string;
  relativePath: string;
  line: number;
  /** 0-based index of the match within this file (line order). Used to scroll to the right occurrence. */
  matchOrdinal: number;
  query: string;
  caseSensitive: boolean;
};

type Props = {
  query: string;
  caseSensitive?: boolean;
  response: SearchResponse | null;
  folders: OpenedFolder[];
  onOpenResult: (a: OpenResultArg) => void;
  onRerun: () => void;
  onClear: () => void;
  busy?: boolean;
};

function attribute(hostPath: string, folders: OpenedFolder[]): { folder: OpenedFolder; relativePath: string } | null {
  let best: OpenedFolder | null = null;
  for (const f of folders) {
    if (hostPath === f.hostPath || hostPath.startsWith(f.hostPath + '\\') || hostPath.startsWith(f.hostPath + '/')) {
      if (!best || f.hostPath.length > best.hostPath.length) best = f;
    }
  }
  if (!best) return null;
  const sep = hostPath.includes('\\') ? '\\' : '/';
  const rel = hostPath.slice(best.hostPath.length + 1).split(sep).join('/');
  return { folder: best, relativePath: rel };
}

type FlatRow = {
  fileHostPath: string;
  attr: ReturnType<typeof attribute>;
  matchIndex: number;
  line: number;
  lineText: string;
};

export function SearchPanel({ query, caseSensitive = false, response, folders, onOpenResult, onRerun, onClear, busy }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (p: string) => expanded[p] !== false;
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const groups = useMemo(() => {
    if (!response) return [];
    return response.files.map((f) => ({ file: f, attr: attribute(f.hostPath, folders) }));
  }, [response, folders]);

  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const g of groups) {
      if (!isExpanded(g.file.hostPath)) continue;
      g.file.matches.forEach((m, i) => {
        rows.push({ fileHostPath: g.file.hostPath, attr: g.attr, matchIndex: i, line: m.line, lineText: m.lineText });
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, expanded]);

  function openRow(row: FlatRow) {
    if (!row.attr) return;
    onOpenResult({
      folderId: row.attr.folder.id,
      relativePath: row.attr.relativePath,
      line: row.line,
      matchOrdinal: row.matchIndex,
      query,
      caseSensitive,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatRows.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatRows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = selectedIdx >= 0 ? selectedIdx : 0;
      const row = flatRows[idx];
      if (row) openRow(row);
    }
  }

  if (!response) {
    if (busy) {
      return (
        <div className="flex h-full flex-col text-xs">
          <div className="h-0.5 w-full overflow-hidden bg-accent-soft">
            <div className="h-full w-1/3 animate-pulse bg-accent" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
            <Spinner />
            <span>Searching{query ? ` for "${query}"` : ''}…</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted">
        No search yet. Press Ctrl+Shift+F to start.
      </div>
    );
  }

  const fileCount = response.files.length;
  return (
    <div className="flex h-full flex-col text-xs">
      {busy && (
        <div className="h-0.5 w-full overflow-hidden bg-accent-soft">
          <div className="h-full w-1/3 animate-pulse bg-accent" />
        </div>
      )}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1">
        <div className="text-muted">
          <span className="font-medium">&quot;{query}&quot;</span>
          {' · '}
          {response.totalMatches} {response.totalMatches === 1 ? 'match' : 'matches'} in {fileCount} {fileCount === 1 ? 'file' : 'files'}
          {' · '}
          {response.elapsedMs} ms
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onRerun} disabled={busy} aria-label="Re-run search" className="rounded px-1.5 py-0.5 hover:bg-surface-2">↻</button>
          <button type="button" onClick={onClear} aria-label="Clear results" className="rounded px-1.5 py-0.5 hover:bg-surface-2">Clear</button>
        </div>
      </div>
      {response.files.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted">No matches.</div>
      ) : (
        <div
          data-testid="search-results-container"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex-1 overflow-y-auto focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <ul>
            {groups.map(({ file, attr }) => (
              <li key={file.hostPath}>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [file.hostPath]: !isExpanded(file.hostPath) }))}
                  className="flex w-full items-center gap-2 px-3 py-1 text-left font-medium hover:bg-surface-2"
                >
                  <span className="w-3" aria-hidden>
                    {isExpanded(file.hostPath) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                  <span style={{ color: attr?.folder.color ?? undefined }}>{attr ? `${attr.folder.name}/${attr.relativePath}` : file.hostPath}</span>
                  <span className="text-muted">({file.matches.length})</span>
                </button>
                {isExpanded(file.hostPath) && attr && (
                  <ul>
                    {file.matches.map((m, i) => {
                      const flatIdx = flatRows.findIndex((r) => r.fileHostPath === file.hostPath && r.matchIndex === i);
                      const isSelected = flatIdx === selectedIdx;
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => { setSelectedIdx(flatIdx); openRow({ fileHostPath: file.hostPath, attr, matchIndex: i, line: m.line, lineText: m.lineText }); }}
                            className={[
                              'flex w-full items-start gap-3 px-6 py-0.5 text-left hover:bg-surface-2',
                              isSelected ? 'bg-accent-soft ring-1 ring-accent' : '',
                            ].join(' ')}
                          >
                            <span className="w-8 font-mono text-muted">{m.line}:</span>
                            <span className="text-fg">{m.lineText}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {response.truncated && (
        <div className="border-t border-yellow-300 bg-yellow-50 px-3 py-1 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          Showing first {response.totalMatches} matches. Narrow your query.
        </div>
      )}
      {response.cancelled && (
        <div className="border-t border-border bg-surface-2 px-3 py-1 text-fg">
          Search cancelled. Showing partial results.
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
