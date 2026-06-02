import { describe, it, expect } from 'vitest';
import { parseBranches } from './git-branch-parse';

describe('parseBranches', () => {
  it('parses local + remote branches and the current one', () => {
    const raw = [
      '* main',
      '  feature/x',
      '  remotes/origin/main',
      '  remotes/origin/feature/x',
    ].join('\n');
    const b = parseBranches(raw);
    expect(b.current).toBe('main');
    expect(b.local).toEqual(['main', 'feature/x']);
    expect(b.remote).toEqual(['origin/main', 'origin/feature/x']);
  });

  it('ignores the symbolic HEAD pointer line', () => {
    const raw = ['* main', '  remotes/origin/HEAD -> origin/main'].join('\n');
    const b = parseBranches(raw);
    expect(b.remote).toEqual([]);
  });

  it('handles detached HEAD', () => {
    const raw = ['* (HEAD detached at abc123)', '  main'].join('\n');
    const b = parseBranches(raw);
    expect(b.current).toBeNull();
    expect(b.local).toEqual(['main']);
  });
});
