'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getApi, hasApi } from '@/lib/electron-api';
import { parseStatus } from '@/lib/git-status-parse';
import { parseBranches } from '@/lib/git-branch-parse';
import type { GitStatus, GitBranches, GitFileStatus } from '@/types';

export type SplitFiles = { staged: GitFileStatus[]; unstaged: GitFileStatus[]; conflicts: GitFileStatus[] };

/** Partition porcelain files into staged / unstaged / conflicted buckets. */
export function splitFiles(files: GitFileStatus[]): SplitFiles {
  const staged: GitFileStatus[] = [];
  const unstaged: GitFileStatus[] = [];
  const conflicts: GitFileStatus[] = [];
  for (const file of files) {
    if (file.conflicted) { conflicts.push(file); continue; }
    if (file.index === '?') { unstaged.push(file); continue; }     // untracked
    if (file.index !== ' ') staged.push(file);
    if (file.workingTree !== ' ') unstaged.push(file);
  }
  return { staged, unstaged, conflicts };
}

export type GitStoreState = {
  status: GitStatus | null;
  branches: GitBranches | null;
  busy: boolean;
  busyLabel: string | null;
  lastError: string | null;
};

export function useGitStore(root: string | null) {
  const [state, setState] = useState<GitStoreState>({ status: null, branches: null, busy: false, busyLabel: null, lastError: null });
  const rootRef = useRef(root);
  useEffect(() => { rootRef.current = root; }, [root]);

  const refresh = useCallback(async () => {
    const r = rootRef.current;
    if (!r || !hasApi()) { setState((s) => ({ ...s, status: null, branches: null })); return; }
    const [st, br] = await Promise.all([getApi().git.status(r), getApi().git.branches(r)]);
    setState((s) => ({
      ...s,
      status: st.ok ? parseStatus(st.stdout) : s.status,
      branches: br.ok ? parseBranches(br.stdout) : s.branches,
    }));
  }, []);

  useEffect(() => { void refresh(); }, [root, refresh]);
  // Refresh when the window regains focus (catches terminal-side git changes).
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  /** Run a mutating git op then refresh; surfaces stderr on failure.
   *  `label` (set for slow network ops) drives a loading overlay. */
  const act = useCallback(async (fn: (r: string) => Promise<{ ok: boolean; stderr: string }>, label?: string) => {
    const r = rootRef.current;
    if (!r) return { ok: false, stderr: 'no repo' };
    setState((s) => ({ ...s, busy: true, busyLabel: label ?? null, lastError: null }));
    const res = await fn(r);
    if (!res.ok && hasApi()) {
      try { void getApi().app.logError('git', `${label ?? 'op'} in ${r}: ${res.stderr.trim()}`); } catch {}
    }
    setState((s) => ({ ...s, busy: false, busyLabel: null, lastError: res.ok ? null : res.stderr.trim() || 'git error' }));
    await refresh();
    return res;
  }, [refresh]);

  const api = {
    refresh,
    stage: (paths: string[]) => act((r) => getApi().git.stage(r, paths)),
    unstage: (paths: string[]) => act((r) => getApi().git.unstage(r, paths)),
    discard: (paths: string[]) => act((r) => getApi().git.discard(r, paths)),
    commit: (message: string) => act((r) => getApi().git.commit(r, message)),
    checkout: (branch: string) => act((r) => getApi().git.checkout(r, branch), `Switching to ${branch}…`),
    createBranch: (name: string, from?: string) => act((r) => getApi().git.createBranch(r, name, from), `Creating ${name}…`),
    merge: (branch: string) => act((r) => getApi().git.merge(r, branch), `Merging ${branch}…`),
    fetch: () => act((r) => getApi().git.fetch(r), 'Fetching…'),
    pull: () => act((r) => getApi().git.pull(r), 'Pulling…'),
    push: () => act((r) => getApi().git.push(r), 'Pushing…'),
    sync: () => act((r) => getApi().git.sync(r), 'Syncing…'),
  };

  return { ...state, ...api };
}
