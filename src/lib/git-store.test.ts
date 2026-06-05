import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { splitFiles, useGitStore } from './git-store';
import type { GitFileStatus } from '@/types';

const f = (path: string, index: string, workingTree: string, conflicted = false): GitFileStatus =>
  ({ path, index, workingTree, conflicted });

describe('splitFiles', () => {
  it('separates staged, unstaged, and conflicted', () => {
    const files = [
      f('a.ts', 'M', ' '),          // staged only
      f('b.ts', ' ', 'M'),          // unstaged only
      f('c.ts', 'M', 'M'),          // both
      f('d.ts', '?', '?'),          // untracked -> unstaged
      f('e.ts', 'U', 'U', true),    // conflicted
    ];
    const { staged, unstaged, conflicts } = splitFiles(files);
    expect(staged.map((x) => x.path)).toEqual(['a.ts', 'c.ts']);
    expect(unstaged.map((x) => x.path)).toEqual(['b.ts', 'c.ts', 'd.ts']);
    expect(conflicts.map((x) => x.path)).toEqual(['e.ts']);
  });
});

describe('useGitStore activity gating', () => {
  const gitResult = { ok: true, code: 0, stdout: '', stderr: '' };
  let status: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    status = vi.fn().mockResolvedValue(gitResult);
    window.mdreader = {
      git: { status, branches: vi.fn().mockResolvedValue(gitResult) },
    } as never;
  });

  it('skips focus refreshes while inactive and catches up on activation', async () => {
    const { rerender, unmount } = renderHook(
      ({ active }) => useGitStore('C:/repo', active),
      { initialProps: { active: false } },
    );
    await waitFor(() => expect(status).toHaveBeenCalledTimes(1)); // initial load

    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(status).toHaveBeenCalledTimes(1); // gated while hidden

    rerender({ active: true });
    await waitFor(() => expect(status).toHaveBeenCalledTimes(2)); // catch-up

    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(status).toHaveBeenCalledTimes(3)); // live again
    unmount();
  });
});
