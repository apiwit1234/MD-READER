'use client';
import { useState } from 'react';
import type { GitBranches } from '@/types';

type Props = {
  branches: GitBranches | null;
  ahead: number;
  behind: number;
  onCheckout: (branch: string) => void;
  onCreate: (name: string) => void;
  onMerge: (branch: string) => void;
};

/** Strip the remote name from a remote ref (origin/feature/x -> feature/x). */
function localNameOf(remoteRef: string): string {
  const i = remoteRef.indexOf('/');
  return i >= 0 ? remoteRef.slice(i + 1) : remoteRef;
}

export function BranchMenu({ branches, ahead, behind, onCheckout, onCreate, onMerge }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'local' | 'remote'>('local');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const current = branches?.current ?? '(detached)';

  const local = branches?.local ?? [];
  const remote = (branches?.remote ?? []).filter((b) => !b.endsWith('/HEAD'));

  const q = query.trim().toLowerCase();
  const filteredLocal = q ? local.filter((b) => b.toLowerCase().includes(q)) : local;
  const filteredRemote = q ? remote.filter((b) => b.toLowerCase().includes(q)) : remote;

  function close() { setOpen(false); setQuery(''); setCreating(false); setNewName(''); }

  function submitCreate() {
    const name = newName.trim();
    if (name) onCreate(name);
    close();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2"
      >
        <span className="truncate">⎇ {current}</span>
        <span className="ml-2 font-mono text-[10px] text-muted">↑{ahead} ↓{behind}</span>
      </button>
      {open && branches && (
        <div className="absolute z-50 mt-1 flex max-h-80 w-full flex-col overflow-hidden rounded-md border border-border bg-surface text-xs shadow-lg">
          <div className="flex border-b border-border p-1">
            <TabBtn active={tab === 'local'} onClick={() => setTab('local')} label={`Local (${local.length})`} />
            <TabBtn active={tab === 'remote'} onClick={() => setTab('remote')} label={`Remote (${remote.length})`} />
          </div>

          <div className="border-b border-border p-1">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
              placeholder="Search branches…"
              className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-fg outline-none placeholder:text-muted focus:border-accent"
            />
          </div>

          <div className="overflow-y-auto py-1">
            {tab === 'local' && (
              filteredLocal.length === 0 ? <Empty /> : filteredLocal.map((b) => {
                const isCurrent = b === branches.current;
                return (
                  <div key={b} className="group flex items-center gap-1 px-2 py-1 hover:bg-surface-2">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => { onCheckout(b); close(); }}
                      className={['flex-1 truncate text-left', isCurrent ? 'font-medium text-accent' : 'text-fg'].join(' ')}
                    >
                      {isCurrent ? '● ' : ''}{b}
                    </button>
                    {!isCurrent && (
                      <button
                        type="button"
                        title={`Merge ${b} into ${branches.current}`}
                        onClick={() => { onMerge(b); close(); }}
                        className="shrink-0 rounded px-1 text-muted opacity-0 hover:bg-bg hover:text-fg group-hover:opacity-100"
                      >
                        merge
                      </button>
                    )}
                  </div>
                );
              })
            )}
            {tab === 'remote' && (
              filteredRemote.length === 0 ? <Empty /> : filteredRemote.map((b) => (
                <button
                  key={b}
                  type="button"
                  title={`Check out ${b} as ${localNameOf(b)}`}
                  onClick={() => { onCheckout(localNameOf(b)); close(); }}
                  className="block w-full truncate px-2 py-1 text-left text-fg hover:bg-surface-2"
                >
                  {b}
                </button>
              ))
            )}
          </div>

          {creating ? (
            <div className="flex items-center gap-1 border-t border-border p-1">
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreate();
                  else if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                placeholder="New branch name"
                className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-fg outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="button"
                disabled={!newName.trim()}
                onClick={submitCreate}
                className="shrink-0 rounded bg-accent px-2 py-1 text-xs text-accent-fg disabled:opacity-40"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="border-t border-border px-2 py-1.5 text-left text-accent hover:bg-surface-2"
            >
              + Create branch…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded px-2 py-1 text-center text-[11px] transition-colors',
        active ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Empty() {
  return <div className="px-2 py-1 text-[11px] text-muted">none</div>;
}
