import { describe, it, expect } from 'vitest';
import { splitFiles } from './git-store';
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
